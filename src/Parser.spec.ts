import { Parser, Tokenizer } from ".";

describe("API", () => {
    test("should work without callbacks", () => {
        const cbs: Record<string, (t?: string) => void> = {};
        const p = new Parser(cbs, {
            xmlMode: true,
            lowerCaseAttributeNames: true,
        });

        p.end("<a foo><bar></a><!-- --><![CDATA[]]]><?foo?><!bar><boo/>boohay");
        p.write("foo");

        // Check for an error
        p.end();
        let err = false;
        cbs.onerror = () => (err = true);
        p.write("foo");
        expect(err).toBeTruthy();
        err = false;
        p.end();
        expect(err).toBeTruthy();

        p.reset();

        // Remove method
        cbs.onopentag = () => {
            /* Ignore */
        };
        p.write("<a foo");
        delete cbs.onopentag;
        p.write(">");

        // Pause/resume
        let processed = false;
        cbs.ontext = (t) => {
            expect(t).toBe("foo");
            processed = true;
        };
        p.pause();
        p.write("foo");
        expect(processed).toBeFalsy();
        p.resume();
        expect(processed).toBeTruthy();
        processed = false;
        p.pause();
        expect(processed).toBeFalsy();
        p.resume();
        expect(processed).toBeFalsy();
        p.pause();
        p.end("foo");
        expect(processed).toBeFalsy();
        p.resume();
        expect(processed).toBeTruthy();
    });

    test("should back out of numeric entities (#125)", () => {
        let finished = false;
        let text = "";
        const p = new Parser({
            ontext(data) {
                text += data;
            },
            onend() {
                finished = true;
            },
        });

        p.end("id=770&#anchor");

        expect(finished).toBeTruthy();
        expect(text).toBe("id=770&#anchor");

        p.reset();
        text = "";
        finished = false;

        p.end("0&#xn");

        expect(finished).toBeTruthy();
        expect(text).toBe("0&#xn");
    });

    test("should update the position", () => {
        const p = new Parser();

        p.write("foo");

        expect(p.startIndex).toBe(0);
        expect(p.endIndex).toBe(2);

        p.write("<select>");

        expect(p.startIndex).toBe(3);
        expect(p.endIndex).toBe(10);

        p.write("<select>");

        expect(p.startIndex).toBe(11);
        expect(p.endIndex).toBe(18);

        p.parseChunk("</select>");

        expect(p.startIndex).toBe(19);
        expect(p.endIndex).toBe(27);
    });

    test("should not have the start index be greater than the end index", () => {
        const onopentag = jest.fn();
        const onclosetag = jest.fn();

        const p = new Parser({
            onopentag(tag) {
                expect(p.startIndex).toBeLessThanOrEqual(p.endIndex);
                onopentag(tag, p.startIndex, p.endIndex);
            },
            onclosetag(tag) {
                expect(p.startIndex).toBeLessThanOrEqual(p.endIndex);
                onclosetag(tag, p.endIndex);
            },
        });

        p.write("<p>");

        expect(onopentag).toHaveBeenLastCalledWith("p", 0, 2);
        expect(onclosetag).not.toHaveBeenCalled();

        p.write("Foo");

        p.write("<hr>");

        expect(onopentag).toHaveBeenLastCalledWith("hr", 6, 9);
        expect(onclosetag).toBeCalledTimes(2);
        expect(onclosetag).toHaveBeenNthCalledWith(1, "p", 9);
        expect(onclosetag).toHaveBeenNthCalledWith(2, "hr", 9);
    });

    test("should update the position when a single tag is spread across multiple chunks", () => {
        const p = new Parser();

        p.write("<div ");
        p.write("foo=bar>");

        expect(p.startIndex).toBe(0);
        expect(p.endIndex).toBe(12);
    });

    test("should have the correct position for implied opening tags", () => {
        const p = new Parser();

        p.write("</p>");

        expect(p.startIndex).toBe(0);
        expect(p.endIndex).toBe(3);
    });

    test("should parse <__proto__> (#387)", () => {
        const p = new Parser(null);

        // Should not throw
        p.write("<__proto__>");
    });

    test("should support custom tokenizer", () => {
        class CustomTokenizer extends Tokenizer {}

        const p = new Parser(
            {
                onparserinit(parser: Parser) {
                    // @ts-expect-error Accessing private tokenizer here
                    expect(parser.tokenizer).toBeInstanceOf(CustomTokenizer);
                },
            },
            { Tokenizer: CustomTokenizer }
        );
        p.done();
    });
});
