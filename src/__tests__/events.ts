import { Parser } from "../index.js";
import * as helper from "../__fixtures__/test-helper.js";

helper.createSuite("Events", ({ options, input }, callback) =>
    helper.writeToParser(
        helper.getEventCollector(callback),
        options?.parser,
        input
    )
);

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
