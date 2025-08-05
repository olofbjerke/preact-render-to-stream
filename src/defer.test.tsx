import test from "node:test";
import assert from "node:assert";

import { DefaultHead, Defer, toStream } from "./defer.js";
import { Suspense, lazy, useContext } from "preact/compat";
import { ComponentChildren, createContext, VNode } from "preact";
import { collectIterator } from "./collectIterator.js";

test("fast stream contains only render result", async (t) => {
    let p = promiseWithResolver();
    let stream = render(
        <Defer
            promise={p.promise}
            render={(a) => <div>{a}</div>}
            fallback={() => <span>loading</span>}
            onError={() => <div></div>}
        />
    );

    p.resolve("Resolve");

    let content = await collectIterator(stream);
    assert(content.includes("<div>Resolve</div>"));
});

test("fast stream contains only error", async (t) => {
    let p = promiseWithResolver();
    let stream = render(
        <Defer
            promise={p.promise}
            render={(a) => <div>{a}</div>}
            fallback={() => <span>loading</span>}
            onError={(e) => <div>{e}</div>}
        />
    );

    p.reject("err");

    let content = await collectIterator(stream);
    assert(content.includes("<div>err</div>"));
});

test("Stream awaits suspense lazy component", async (t) => {
    let p = promiseWithResolver<() => VNode>();
    let LazyComponent = lazy(() => p.promise);
    let stream = render(
        <Suspense fallback={<span>suspense</span>}>
            <LazyComponent />
        </Suspense>
    );

    p.resolve(() => <div>loaded</div>);

    let content = await collectIterator(stream);
    assert.doesNotMatch(content, /<span>suspense<\/span>/);
    assert.match(content, /<div>loaded<\/div>/);
});

test("fast deferred content is inlined directly", async (t) => {
    let p = promiseWithResolver<VNode>();

    let stream = render(
        <Defer
            promise={p.promise}
            render={(a) => <div>Result: {a}</div>}
            fallback={() => <span>loading</span>}
            onError={() => <div></div>}
        />
    );

    let contentPromise = collectIterator(stream);

    await new Promise((res) => setTimeout(res, 0));
    p.resolve(<div>loaded</div>);

    let content = await contentPromise;
    assert.doesNotMatch(content, /<span>loading<\/span>/);
    assert.match(content, /<div>loaded<\/div>/);
});

test("slow deferred content is added as slot", async (t) => {
    let p = promiseWithResolver<VNode>();

    let stream = render(
        <Defer
            promise={p.promise}
            render={(a) => <div>Result: {a}</div>}
            fallback={() => <span>loading</span>}
            onError={() => <div></div>}
        />
    );

    let contentPromise = collectIterator(stream);

    await new Promise((res) => setTimeout(res, 20));
    p.resolve(<div>loaded</div>);

    let content = await contentPromise;
    assert.match(content, /<span>loading<\/span>/);
    assert.match(content, /<div>loaded<\/div>/);
});

test("Stream awaits suspense lazy component", async (t) => {
    let p = promiseWithResolver<() => VNode>();
    let LazyComponent = lazy(() => p.promise);
    let stream = render(
        <Suspense fallback={<span>suspense</span>}>
            <LazyComponent />
        </Suspense>
    );

    p.resolve(() => <div>loaded</div>);

    let content = await collectIterator(stream);
    assert.doesNotMatch(content, /<span>suspense<\/span>/);
    assert.match(content, /<div>loaded<\/div>/);
});

test("Stream awaits suspense in head", async (t) => {
    let p = promiseWithResolver<() => VNode>();
    let LazyComponent = lazy(() => p.promise);
    
    let stream = toStream(
        {
            head: (
                <Suspense fallback={<title>suspense</title>}>
                    <LazyComponent />
                </Suspense>
            ),
        },
        <div>Default</div>
    );

    p.resolve(() => <title>loaded</title>); 

    let content = await collectIterator(stream);
    assert.doesNotMatch(content, /<title>suspense<\/title>/);
    assert.match(content, /<title>loaded<\/title>/);
});

test("Uses template when provided.", async (t) => {
    let stream = toStream(
        {
            template: "<html>{{body}}</html>",
            head: <DefaultHead />,
        },
        <div>Hello</div>
    );

    let content = await collectIterator(stream);
    
    assert.equal(content, "<html><div>Hello</div></html>");
});

const testContext = createContext(null);
function useTestContext() {
    let current = useContext(testContext);
    if (!current) {
        throw new Error("no context");
    }

    return current;
}

function UsesContext({ children }: { children: ComponentChildren }) {
    let value = useTestContext();
    return (
        <div>
            Context: {value} {children}
        </div>
    );
}

function nestedContext(
    text: string,
    promiseCallback: (p: ReturnType<typeof promiseWithResolver>) => void,
    assertCb: (output: string) => void
) {
    test(text, async (t) => {
        let p = promiseWithResolver<() => VNode>();

        let stream = render(
            <testContext.Provider value="test">
                <UsesContext>First</UsesContext>
                <Defer
                    promise={p.promise}
                    render={(a) => <UsesContext>Result: {a}</UsesContext>}
                    fallback={() => <UsesContext>Loading</UsesContext>}
                    onError={() => <UsesContext>Error</UsesContext>}
                />
            </testContext.Provider>
        );

        let contentPromise = collectIterator(stream);
        await new Promise((resolve) => setTimeout(resolve, 40));

        promiseCallback(p);

        let content = await contentPromise;

        assertCb(content);
    });
}

nestedContext(
    "Stream passes context down into rendered pieces",
    (p) => {
        p.resolve(() => <>"Resolve"</>);
    },
    (content) => {
        assert.match(content, /<div>Context: test First<\/div>/);
    }
);

nestedContext(
    "Stream passes context down into rendered pieces when rejected",
    (p) => {
        p.reject(() => <>"Resolve"</>);
    },
    (content) => {
        assert.match(content, /<div>Context: test Error<\/div>/);
    }
);

function render(content: VNode, timeout = 10) {
    return toStream({ head: <head />, timeout }, <div>{content}</div>);
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
