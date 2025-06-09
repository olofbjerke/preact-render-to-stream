export async function collectIterator(stream: ReadableStream<unknown>) {
    const decoder = new TextDecoder();
    let content = "";

    for await (const chunk of stream) {
        content += decoder.decode(chunk as any, { stream: true });
    }

    return content;
}
