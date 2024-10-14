# preact-render-to-stream

Render JSX and [Preact](https://github.com/preactjs/preact) components to an HTML stream with out of order deferred elements.

**Demo**: https://preact-render-to-stream.olofbjerke.com

If you use preact for dynamic server side rendering (SSR), then this package can help with First Contentful Paint, as it can defer parts of the UI to be streamed in later in the HTTP response.

The package uses the `preact-render-to-string` package to render the HTML and a special context to defer parts of the UI until their lazy data is ready to be rendered.

This package is inspired by the [Flecks](https://github.com/phlex-ruby/flecks) library for Ruby.

The package is written in TypeScript and is published as a ES module with type definitions.

## Installation

```
npm install preact-render-to-stream
```

## Usage

### No server framework
```tsx

import http from "node:http";
import { toStream, DefaultHead, Defer } from "preact-render-to-stream";

const server = http.createServer(async (req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });

    const stream = toStream(
        <DefaultHead />,
        <>
            <header>
                <h1>preact-render-to-stream demo</h1>
            </header>
            <main>
                <Defer
                    promise={new Promise((res) => setTimeout(() => res("Got data"), 1500))}
                    fallback={() => <p>Loading</p>}
                    render={(d) => <p>{d}</p>}
                />
                <p>This is shown even though the previous component is slow.</p>
            </main>
        </>
    );

    for await (const part of stream) {
        res.write(part);
    }

    res.end();
});

server.listen(8000);

```

## API

### `toStream(head: VNode, body: VNode, endOfBody?: VNode): ReadableStream<unknown>`

Renders the given JSX elements to an HTML stream.

### `<Defer />` component

Defers rendering of the given component until the `promise` is resolved. It adds a `data-deferred-slot` attribute to the fallback component, so that the deferred component can be inserted into the DOM later.

#### Props

- `promise: Promise<T>`: The promise to wait for.
- `fallback: VNode`: The component to render while the promise is pending.
- `render: (data: T) => VNode`: The component to render when the promise is resolved.
- `onError: (error: unknown) => VNode`: The component to render when the promise is rejected.

### `<DefaultHead />` component

Renders a set of default head tags and any additional tags passed as children.

#### Props

- `title: string`: The title of the page.
- `children: ComponentChildren`: Any tags to render inside the head.

### License

MIT