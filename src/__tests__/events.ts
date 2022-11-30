import { Parser, type ParserOptions } from "../index.js";
import * as helper from "../__fixtures__/test-helper.js";
import fs from "node:fs";
import path from "node:path";

interface TestFile {
    options?: {
        parser?: ParserOptions;
    };
    name: string;
    input: string;
    file: string;
    expected: unknown | unknown[];
}

describe("Events", () => {
    const directory = path.join(__dirname, "..", "__fixtures__", "Events");

    for (const name of fs.readdirSync(directory)) {
        if (name.startsWith(".") || name.startsWith("_")) {
            continue;
        }

        const test: TestFile = JSON.parse(
            fs.readFileSync(path.join(directory, name)) as unknown as string
        );

        let calledTwice = false;

        it(test.name, (done) =>
            helper.writeToParser(
                helper.getEventCollector((error, actual) => {
                    if (error) {
                        return done(error);
                    }

                    expect(actual).toStrictEqual(test.expected);

                    if (calledTwice) {
                        done();
                    } else {
                        calledTwice = true;
                    }
                }),
                test.options?.parser,
                test.input
            )
        );
    }
});

describe("Helper", () => {
    it("should handle errors", () => {
        const eventCallback = jest.fn();
        const parser = new Parser(helper.getEventCollector(eventCallback));

        parser.end();
        parser.write("foo");

        expect(eventCallback).toHaveBeenCalledTimes(2);
        expect(eventCallback).toHaveBeenNthCalledWith(1, null, []);
        expect(eventCallback).toHaveBeenLastCalledWith(
            new Error(".write() after done!")
        );
    });
});
