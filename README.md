# preact-render-to-stream

Render JSX and [Preact](https://github.com/preactjs/preact) components to an HTML stream with out of order deferred elements.

If you use preact for dynamic server side rendering (SSR), then this package can help with First Contentful Paint, as it can defer parts of the UI to be streamed in later in the HTTP response.

The package uses the `preact-render-to-string` package to render the HTML and a special context to defer parts of the UI until their lazy data is ready to be rendered.

This package is inspired by the Flecks library for Ruby.
