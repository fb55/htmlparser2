import { describe, expect, it, vi } from "vitest";
import { Parser, Tokenizer } from "./index.js";
import type { Handler } from "./Parser.js";

describe("API", () => {
    it("should work without callbacks", () => {
        const cbs: Partial<Handler> = { onerror: vi.fn() };
        const p = new Parser(cbs, {
            xmlMode: true,
            lowerCaseAttributeNames: true,
        });

        p.end("<a foo><bar></a><!-- --><![CDATA[]]]><?foo?><!bar><boo/>boohay");
        p.write("foo");

        // Check for an error
        p.end();
        p.write("foo");
        expect(cbs.onerror).toHaveBeenLastCalledWith(
            new Error(".write() after done!"),
        );
        p.end();
        expect(cbs.onerror).toHaveBeenLastCalledWith(
            new Error(".end() after done!"),
        );

        // Should ignore the error if there is no callback
        delete cbs.onerror;
        p.write("foo");

        p.reset();

        // Remove method
        cbs.onopentag = vi.fn();
        p.write("<a foo");
        delete cbs.onopentag;
        p.write(">");

        // Pause/resume
        const onText = vi.fn();
        cbs.ontext = onText;
        p.pause();
        p.write("foo");
        expect(onText).not.toHaveBeenCalled();
        p.resume();
        expect(onText).toHaveBeenLastCalledWith("foo");
        p.pause();
        expect(onText).toHaveBeenCalledTimes(1);
        p.resume();
        expect(onText).toHaveBeenCalledTimes(1);
        p.pause();
        p.end("bar");
        expect(onText).toHaveBeenCalledTimes(1);
        p.resume();
        expect(onText).toHaveBeenCalledTimes(2);
        expect(onText).toHaveBeenLastCalledWith("bar");
    });

    it("should back out of numeric entities (#125)", () => {
        const onend = vi.fn();
        let text = "";
        const p = new Parser({
            ontext(data) {
                text += data;
            },
            onend,
        });

        p.end("id=770&#anchor");

        expect(onend).toHaveBeenCalledTimes(1);
        expect(text).toBe("id=770&#anchor");

        p.reset();
        text = "";

        p.end("0&#xn");

        expect(onend).toHaveBeenCalledTimes(2);
        expect(text).toBe("0&#xn");
    });

    it("should not have the start index be greater than the end index", () => {
        const onopentag = vi.fn();
        const onclosetag = vi.fn();

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
        expect(onclosetag).toHaveBeenCalledTimes(2);
        expect(onclosetag).toHaveBeenNthCalledWith(1, "p", 9);
        expect(onclosetag).toHaveBeenNthCalledWith(2, "hr", 9);
    });

    it("should preserve declaration names outside of HTML mode", () => {
        const onprocessinginstruction = vi.fn();

        new Parser(
            {
                onprocessinginstruction,
            },
            { xmlMode: true },
        ).end("<!DOCTYPEhtml>");

        expect(onprocessinginstruction).toHaveBeenCalledWith(
            "!DOCTYPEhtml",
            "!DOCTYPEhtml",
        );
    });

    it("should preserve declaration casing when lowerCaseTags is disabled", () => {
        const onprocessinginstruction = vi.fn();

        new Parser(
            {
                onprocessinginstruction,
            },
            { lowerCaseTags: false },
        ).end("<!DOCTYPEhtml>");

        expect(onprocessinginstruction).toHaveBeenCalledWith(
            "!DOCTYPE",
            "!DOCTYPEhtml",
        );
    });

    it("should update the position when a single tag is spread across multiple chunks", () => {
        let called = false;
        const p = new Parser({
            onopentag() {
                called = true;
                expect(p.startIndex).toBe(0);
                expect(p.endIndex).toBe(12);
            },
        });

        p.write("<div ");
        p.write("foo=bar>");

        expect(called).toBe(true);
    });

    it("should have the correct position for implied opening tags", () => {
        let called = false;
        const p = new Parser({
            onopentag() {
                called = true;
                expect(p.startIndex).toBe(0);
                expect(p.endIndex).toBe(3);
            },
        });

        p.write("</p>");
        expect(called).toBe(true);
    });

    it("should parse <__proto__> (#387)", () => {
        const p = new Parser(null);

        // Should not throw
        p.write("<__proto__>");
    });

    it("should implicitly close table sections when another section opens", () => {
        const onopentagname = vi.fn();
        const onclosetag = vi.fn();

        // <tbody> must auto-close <tfoot>
        new Parser({ onopentagname, onclosetag }).end(
            "<table><tfoot><tr><td>F<tbody><tr><td>B</table>",
        );

        expect(onclosetag).toHaveBeenCalledWith("tfoot", true);
        const tfootClose = onclosetag.mock.calls.findIndex(
            ([name]: [string]) => name === "tfoot",
        );
        const tbodyOpen = onopentagname.mock.calls.findIndex(
            ([name]: [string]) => name === "tbody",
        );
        expect(tfootClose).toBeLessThan(tbodyOpen);
    });

    it("should implicitly close <tbody> when <thead> opens", () => {
        const onopentagname = vi.fn();
        const onclosetag = vi.fn();

        new Parser({ onopentagname, onclosetag }).end(
            "<table><tbody><tr><td>B<thead><tr><th>H</table>",
        );

        expect(onclosetag).toHaveBeenCalledWith("tbody", true);
        const tbodyClose = onclosetag.mock.calls.findIndex(
            ([name]: [string]) => name === "tbody",
        );
        const theadOpen = onopentagname.mock.calls.findIndex(
            ([name]: [string]) => name === "thead",
        );
        expect(tbodyClose).toBeLessThan(theadOpen);
    });

    it("should implicitly close <td> when <th> opens", () => {
        const onclosetag = vi.fn();
        const onopentagname = vi.fn();

        new Parser({ onclosetag, onopentagname }).end(
            "<table><tr><td>A<th>B</tr></table>",
        );

        // <th> must auto-close <td>, making them siblings per the HTML spec
        expect(onclosetag).toHaveBeenCalledWith("td", true);
        const tdClose = onclosetag.mock.calls.findIndex(
            ([name]: [string]) => name === "td",
        );
        const thOpen = onopentagname.mock.calls.findIndex(
            ([name]: [string]) => name === "th",
        );
        expect(tdClose).toBeLessThan(thOpen);
    });

    it("should support custom tokenizer", () => {
        class CustomTokenizer extends Tokenizer {}

        const p = new Parser(
            {
                onparserinit(parser: Parser) {
                    // @ts-expect-error Accessing private tokenizer here
                    expect(parser.tokenizer).toBeInstanceOf(CustomTokenizer);
                },
            },
            { Tokenizer: CustomTokenizer },
        );
        p.end();
    });
});
