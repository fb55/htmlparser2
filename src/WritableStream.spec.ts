import fs from "fs";
import path from "path";
import { WritableStream } from "./WritableStream";
import * as helper from "./__fixtures__/test-helper";

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

helper.createSuite("Stream", (test, cb) => {
    const filePath = path.join(
        __dirname,
        "__fixtures__",
        "Documents",
        test.file
    );

    fs.createReadStream(filePath)
        .pipe(
            new WritableStream(
                helper.getEventCollector((err, events) => {
                    cb(err, events);

                    const handler = helper.getEventCollector(cb);
                    const stream = new WritableStream(handler, test.options);

                    fs.readFile(filePath, (err, data) =>
                        err ? cb(err) : stream.end(data)
                    );
                }),
                test.options
            )
        )
        .on("error", cb);
});
