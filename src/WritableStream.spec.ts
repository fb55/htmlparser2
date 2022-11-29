import fs from "node:fs";
import path from "node:path";
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

        expect(ontext).toBeCalledWith("€");
    });
});

helper.createSuite("Stream", (test, callback) => {
    const filePath = path.join(
        __dirname,
        "__fixtures__",
        "Documents",
        test.file
    );

    fs.createReadStream(filePath)
        .pipe(
            new WritableStream(
                helper.getEventCollector((error, events) => {
                    callback(error, events);

                    const handler = helper.getEventCollector(callback);
                    const stream = new WritableStream(handler, test.options);

                    fs.readFile(filePath, (error, data) =>
                        error ? callback(error) : stream.end(data)
                    );
                }),
                test.options
            )
        )
        .on("error", callback);
});
