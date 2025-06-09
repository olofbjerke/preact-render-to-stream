import { createServer } from "http";
import { createGzip, constants } from "zlib";
import { DefaultHead, Defer, toStream } from "./defer.js";
import { h } from "preact";

const App = () => {
    let p = new Promise<string>((res) => setTimeout(() => res("Hello, world!"), 1000));
    let p2 = new Promise<number[]>((res) => setTimeout(() => res(Array.from({ length: 1000 }).map((_, i) => i)), 2));
    return (
        <div>
            <h1>Hello, world! {Math.random()}</h1>
            <p>This is a Preact server-side rendering example.</p>
            <Defer promise={p} render={(result) => <p>{result}</p>} fallback={() => <p>Loading...</p>} />
            <Defer
                promise={p2}
                render={(result) => {
                    return (
                        <table>
                            {result.map((i) => (
                                <tr>
                                    <td>{i}</td>
                                    <td>{i}</td>
                                    <td>{i}</td>
                                    <td>{i}</td>
                                </tr>
                            ))}
                        </table>
                    );
                }}
                fallback={() => <p>Loading table...</p>}
            />
        </div>
    );
};

const server = createServer(async (req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/html",
        "Content-Encoding": "gzip",
        "Transfer-Encoding": "chunked",
    });

    const gzip = createGzip({ flush: constants.Z_PARTIAL_FLUSH });
    gzip.pipe(res);

    const html = toStream({ head: <DefaultHead /> }, <App />);

    console.log("sending");

    // const reader = html.getReader();

    for await (const chunk of html) {
        // await new Promise((res) => setTimeout(res, 1000));
        console.log(chunk);

        gzip.write(chunk);
    }

    gzip.end();
});

server.listen(3000, () => {
    console.log("Server is listening on port 3000");
});
