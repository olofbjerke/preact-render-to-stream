import test, { describe } from "node:test";
import assert from "node:assert";

import { DefaultHead, Defer, toStream } from "./defer.js";
import { VNode } from "preact";
import { html } from "htm/preact";
import { collectIterator } from "./collectIterator.js";

describe("HTM", () => {
    test("htm stream contains only render result", async (t) => {
        let p = promiseWithResolver();
        let stream = render(
            html`<${Defer}
                promise=${p.promise}
                render=${(a: string) => html`<div>${a}</div>`}
                fallback=${() => html`<span>loading</span>`}
                onError=${() => html`<div></div>`}
            />`
        );

        p.resolve("Resolve");

        let content = await collectIterator(stream);
        assert.match(content, /<div>Resolve<\/div>/);
    });
    
    test("htm stream contains slot when promise is slow", async (t) => {
        let p = promiseWithResolver();
        let stream = render(
            html`<${Defer}
                promise=${p.promise}
                render=${(a: string) => html`<div>${a}</div>`}
                fallback=${() => html`<span>loading</span>`}
                onError=${() => html`<div></div>`}
            />`
        );

        let contentPromise = collectIterator(stream);
        await new Promise((resolve) => setTimeout(resolve, 40));
        p.resolve("Resolve");

        let content = await contentPromise;
        assert.match(content, /<span>loading<\/span>/);
    });

    function render(vnode: VNode) {
        return toStream({ head: html`<${DefaultHead} />` }, vnode);
    }

    

    function promiseWithResolver<T = string>() {
        let resolve: (value: T) => void;
        let reject: (value: T) => void;
        let promise = new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
        });

        return { promise, resolve, reject };
    }
});

