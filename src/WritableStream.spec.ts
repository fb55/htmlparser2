import { createReadStream } from "node:fs";
import * as fs from "node:fs/promises";
import path from "node:path";
import { finished } from "node:stream/promises";
import type { Handler, ParserOptions } from "./Parser.js";
import { WritableStream } from "./WritableStream.js";
import * as helper from "./__fixtures__/test-helper.js";

describe("WritableStream", () => {
    test("should decode fragmented unicode characters", () => {
        const ontext = jest.fn();
        const stream = new WritableStream({ ontext });

        stream.write(Buffer.from([0xe2, 0x82]));
        stream.write(Buffer.from([0xac]));
        stream.write("");
        stream.end();

        expect(ontext).toHaveBeenCalledWith("€");
    });
});

function getPromiseEventCollector(): [
    handler: Partial<Handler>,
    promise: Promise<unknown>
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

    return [handler!, promise];
}

async function testStream(
    file: string,
    options?: ParserOptions
): Promise<void> {
    const filePath = path.join(__dirname, "__fixtures__", "Documents", file);

    const [streamHandler, eventsPromise] = getPromiseEventCollector();

    const fsStream = createReadStream(filePath).pipe(
        new WritableStream(streamHandler, options)
    );

    await finished(fsStream);

    const events = await eventsPromise;

    expect(events).toMatchSnapshot();

    const [singlePassHandler, singlePassPromise] = getPromiseEventCollector();

    const singlePassStream = new WritableStream(singlePassHandler, options).end(
        await fs.readFile(filePath)
    );

    await finished(singlePassStream);

    expect(await singlePassPromise).toStrictEqual(events);
}

describe("Stream", () => {
    it("Basic html", () => testStream("Basic.html"));
    it("Attributes", () => testStream("Attributes.html"));
    it("SVG", () => testStream("SVG.html"));
    it("RSS feed", () => testStream("RSS_Example.xml", { xmlMode: true }));
    it("Atom feed", () => testStream("Atom_Example.xml", { xmlMode: true }));
    it("RDF feed", () => testStream("RDF_Example.xml", { xmlMode: true }));
});
