import { Parser, Tokenizer } from ".";

describe("API", () => {
    test("should work without callbacks", () => {
        const p = new Parser(null, {
            xmlMode: true,
            lowerCaseAttributeNames: true,
        });

        p.end("<a foo><bar></a><!-- --><![CDATA[]]]><?foo?><!bar><boo/>boohay");
        p.write("foo");

        //check for an error
        p.end();
        let err = false;
        p._cbs.onerror = () => (err = true);
        p.write("foo");
        expect(err).toBeTruthy();
        err = false;
        p.end();
        expect(err).toBeTruthy();

        p.reset();

        //remove method
        p._cbs.onopentag = () => {
            /* Ignore */
        };
        p.write("<a foo");
        delete p._cbs.onopentag;
        p.write(">");

        //pause/resume
        let processed = false;
        p._cbs.ontext = (t) => {
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
        const p = new Parser(null);

        p.write("foo");

        expect(p.startIndex).toBe(0);
        expect(p.endIndex).toBe(2);

        p.write("<bar>");

        expect(p.startIndex).toBe(3);
        expect(p.endIndex).toBe(7);
    });

    test("should update the position when a single tag is spread across multiple chunks", () => {
        const p = new Parser(null);

        p.write("<div ");
        p.write("foo=bar>");

        expect(p.startIndex).toBe(0);
        expect(p.endIndex).toBe(12);
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
                    expect(parser._tokenizer).toBeInstanceOf(CustomTokenizer);
                },
            },
            { Tokenizer: CustomTokenizer }
        );
        p.done();
    });
});
