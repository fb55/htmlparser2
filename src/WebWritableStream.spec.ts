import * as fs from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import * as helper from "./__fixtures__/testHelper.js";
import type { Handler, ParserOptions } from "./Parser.js";
import { WebWritableStream } from "./WebWritableStream.js";

describe("WebWritableStream", () => {
    it("should decode fragmented unicode characters", async () => {
        const ontext = vi.fn();
        const stream = new WebWritableStream({ ontext });

        const writer = stream.getWriter();
        // € is U+20AC, encoded as 0xE2 0x82 0xAC in UTF-8
        await writer.write(new Uint8Array([0xe2, 0x82]));
        await writer.write(new Uint8Array([0xac]));
        await writer.write("");
        await writer.close();

        expect(ontext).toHaveBeenCalledWith("€");
    });

    it("should handle string chunks", async () => {
        const ontext = vi.fn();
        const stream = new WebWritableStream({ ontext });

        const writer = stream.getWriter();
        await writer.write("hello");
        await writer.close();

        expect(ontext).toHaveBeenCalledWith("hello");
    });

    it("should handle empty stream", async () => {
        const onend = vi.fn();
        const stream = new WebWritableStream({ onend });

        const writer = stream.getWriter();
        await writer.close();

        expect(onend).toHaveBeenCalledTimes(1);
    });

    it("should handle abort signal", async () => {
        const ontext = vi.fn();
        const onend = vi.fn();
        const stream = new WebWritableStream({ ontext, onend });

        const writer = stream.getWriter();
        await writer.abort(new Error("aborted"));

        expect(ontext).not.toHaveBeenCalled();
        expect(onend).not.toHaveBeenCalled();
    });

    it("should work with ReadableStream.pipeTo", async () => {
        const onopentag = vi.fn();
        const ontext = vi.fn();
        const stream = new WebWritableStream({ onopentag, ontext });

        const html = "<div>hello</div>";
        const readable = new ReadableStream<string>({
            start(controller) {
                controller.enqueue(html);
                controller.close();
            },
        });

        await readable.pipeTo(stream);

        expect(onopentag).toHaveBeenCalledWith("div", {}, false);
        expect(ontext).toHaveBeenCalledWith("hello");
    });

    it("Basic html", () => testStream("Basic.html"));
    it("Attributes", () => testStream("Attributes.html"));
    it("SVG", () => testStream("Svg.html"));
    it("RSS feed", () => testStream("RSS_Example.xml", { xmlMode: true }));
    it("Atom feed", () => testStream("Atom_Example.xml", { xmlMode: true }));
    it("RDF feed", () => testStream("RDF_Example.xml", { xmlMode: true }));
});

function getPromiseEventCollector(): [
    handler: Partial<Handler>,
    promise: Promise<unknown>,
] {
    let handler: Partial<Handler> | undefined;
    const promise = new Promise<unknown>((resolve, reject) => {
        handler = helper.getEventCollector((error, events) => {
            if (error) {
                reject(error);
            } else {
                resolve(events);
            }
        });
    });

    if (!handler) {
        throw new Error("Failed to initialize event handler");
    }

    return [handler, promise];
}

async function testStream(
    file: string,
    options?: ParserOptions,
): Promise<void> {
    const filePath = new URL(`__fixtures__/Documents/${file}`, import.meta.url);

    const [streamHandler, eventsPromise] = getPromiseEventCollector();

    const fileContents = await fs.readFile(filePath);

    // Pipe file contents through a ReadableStream into the WebWritableStream
    const readable = new ReadableStream<Uint8Array>({
        start(controller) {
            controller.enqueue(new Uint8Array(fileContents));
            controller.close();
        },
    });

    await readable.pipeTo(new WebWritableStream(streamHandler, options));

    const events = await eventsPromise;

    expect(events).toMatchSnapshot();

    // Verify single-pass produces identical results
    const [singlePassHandler, singlePassPromise] = getPromiseEventCollector();

    const singlePassReadable = new ReadableStream<string>({
        start(controller) {
            controller.enqueue(fileContents.toString());
            controller.close();
        },
    });

    await singlePassReadable.pipeTo(
        new WebWritableStream(singlePassHandler, options),
    );

    expect(await singlePassPromise).toStrictEqual(events);
}
