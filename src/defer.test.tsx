import test from "node:test";
import assert from "node:assert";

import { Defer, toIterator } from "./defer.js";
import { Suspense, lazy } from "preact/compat";
import { VNode } from "preact";

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

function render(content: VNode, timeout = 10) {
    return toIterator({ head: <head />, timeout }, <div>{content}</div>);
}

async function collectIterator(stream: AsyncGenerator<unknown, void, unknown>) {
    let content = "";

    for await (const chunk of stream) {
        content += chunk;
    }

    return content;
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
