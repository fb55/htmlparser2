import { Parser } from "..";
import * as helper from "../__fixtures__/test-helper";

helper.createSuite("Events", (test, cb) =>
    helper.writeToParser(
        helper.getEventCollector(cb),
        test.options?.parser,
        test.html
    )
);

describe("Helper", () => {
    it("should handle errors", () => {
        const eventCb = jest.fn();
        const parser = new Parser(helper.getEventCollector(eventCb));

        parser.end();
        parser.write("foo");

        expect(eventCb).toHaveBeenCalledTimes(2);
        expect(eventCb).toHaveBeenNthCalledWith(1, null, []);
        expect(eventCb).toHaveBeenLastCalledWith(
            new Error(".write() after done!")
        );
    });
});
