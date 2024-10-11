# preact-render-to-stream

Render JSX and [Preact](https://github.com/preactjs/preact) components to an HTML stream with out of order deferred elements.

If you use preact for dynamic server side rendering (SSR), then this package can help with First Contentful Paint, as it can defer parts of the UI to be streamed in later in the HTTP response.

The package uses the `preact-render-to-string` package to render the HTML and a special context to defer parts of the UI until their lazy data is ready to be rendered.

This package is inspired by the Flecks library for Ruby.

## Example
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
                    promise={new Promise<string>((res) => setTimeout(() => res("Got data"), 1500))}
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