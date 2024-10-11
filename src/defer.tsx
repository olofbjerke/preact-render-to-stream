import { ReadableStream } from "node:stream/web";

import { ComponentChildren, createContext, VNode } from "preact";
import { renderToStringAsync } from "preact-render-to-string";
import { useContext } from "preact/hooks";
import { baseTemplate, createSlotTemplate, BaseTemplate, TemplateParts, visibleBytesForSafari } from "./template.js";

type DeferredSlot = {
    promise: Promise<unknown>;
    render(data: unknown): VNode;
    onError(data: unknown): VNode;
};

interface DeferredSlots {
    add(data: DeferredSlot): string;
}

type WithChildren<T = {}> = T & {
    children?: ComponentChildren;
};

const deferredSlotsContext = createContext<DeferredSlots>(null);

/**
 * Creates a readable stream of the VNode tree.
 * @param head - The head content.
 * @param body - The body content.
 * @param endOfBody - Append content after all deferred slots.
 * @returns A readable html stream that can be sent over http.
 */
export function toStream(head: VNode, body: VNode, endOfBody?: VNode) {
    return ReadableStream.from(rendererIterator(head, body, endOfBody));
}

/** Props for the {@link Defer} component */
interface DeferProps<T> {
    /** The promise that will will be awaited before the slot is rendered */
    promise: Promise<T>;
    /**
     * Render callback that receives the resolved value of the promise
     * @param data
     */
    render(data: T): VNode;
    /**
     * Fallback to render in the slot until the promise resolves.
     */
    fallback(): ComponentChildren;

    /**
     * Render callback when the promise is rejected.
     * @param error - The rejection error from the {@link DeferProps.promise}
     */
    onError?(error: any): VNode;
}

/**
 * Defer a piece of UI to be rendered when a promise is resolved.
 * It allows the UI to be sent back to the client as soon as possible, by deferring parts of the UI
 * @param props
 * @returns A temporary element with the {@link DeferProps.fallback } content.
 */
export function Defer<T>({ promise, fallback, render, onError }: DeferProps<T>) {
    let id = useContext(deferredSlotsContext).add({
        promise,
        onError,
        render,
    });

    return (
        <div style="display: contents" data-defferred-slot={id}>
            {fallback()}
        </div>
    );
}

/** Default head content */
export function DefaultHead({
    children,
    title,
}: WithChildren<{
    /** Page title */
    title?: string;
}>) {
    return (
        <>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>{title}</title>
            {children}
        </>
    );
}

async function* rendererIterator(head: VNode, body: VNode, endOfBody?: VNode) {
    let deferredSlots = createDeferredSlotsContext();

    let template = htmlGenerator(baseTemplate, {
        visibleBytesForSafari,
        head: renderToStringAsync(head),
        body: renderToStringAsync(<Root context={deferredSlots}>{body}</Root>),
        deferredSlots,
        endOfBody: endOfBody ? renderToStringAsync(endOfBody) : "",
    });

    for await (const part of template) {
        yield part;
    }
}

async function* htmlGenerator(template: BaseTemplate, slots: TemplateParts) {
    let templateParts = template.templateParts;
    let slotNames = template.slots;

    for (let index = 0; index < templateParts.length; index++) {
        yield templateParts[index];

        let templateSlot = slots[slotNames[index]];

        if (templateSlot == null) {
            continue;
        }

        if (templateSlot && typeof templateSlot == "object") {
            if ("then" in templateSlot) {
                yield await templateSlot;
                continue;
            }

            if (hasIterator(templateSlot)) {
                for await (const elem of templateSlot) {
                    yield elem;
                }

                continue;
            }
        }

        yield "" + templateSlot;
    }
}

function Root({ context, children }: { context: DeferredSlots; children: ComponentChildren }) {
    return <deferredSlotsContext.Provider value={context}>{children}</deferredSlotsContext.Provider>;
}

function createDeferredSlotsContext() {
    let idCounter = 0;
    let queueSize = 0;

    let notifyResult: () => void | undefined;
    const chunkTemplateResults: string[] = [];

    return {
        add(deferredSlot: DeferredSlot) {
            queueSize++;
            const slotId = `slot-${idCounter++}`;

            deferredSlot.promise.then(
                (res) => addResult(deferredSlot.render(res)),
                (rejection) => addResult(deferredSlot.onError?.(rejection) ?? <div>{rejection}</div>)
            );

            return slotId;

            async function addResult(result: VNode) {
                let renderedString = await renderToStringAsync(result);
                chunkTemplateResults.push(createSlotTemplate(slotId, renderedString));
                queueSize--;
                notifyResult?.();
            }
        },
        [Symbol.asyncIterator]() {
            return {
                async next(): Promise<IteratorResult<string>> {
                    let pending = queueSize > 0;

                    if (!chunkTemplateResults.length && pending) {
                        await nextResult();
                    }

                    const done = chunkTemplateResults.length == 0 && !pending;

                    return {
                        value: chunkTemplateResults.shift(),
                        done,
                    };
                },
            };
        },
    };

    function nextResult() {
        return new Promise<void>((res) => (notifyResult = res));
    }
}

function hasIterator(obj: {
    [Symbol.asyncIterator]?: {};
}): obj is { [Symbol.asyncIterator]: () => AsyncIterator<unknown> } {
    return !!obj[Symbol.asyncIterator];
}
