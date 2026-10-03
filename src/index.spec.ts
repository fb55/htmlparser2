import { Element } from "domhandler";
import { describe, expect, it } from "vitest";
import {
    createDocumentStream,
    DefaultHandler,
    DomHandler,
    type Parser,
    parseDocument,
} from "./index.js";

// Add an `attributes` prop to the Element for now, to make it possible for Jest to render DOM nodes.
Object.defineProperty(Element.prototype, "attributes", {
    get() {
        return Object.keys(this.attribs).map((name) => ({
            name,
            value: this.attribs[name],
        }));
    },
    configurable: true,
    enumerable: false,
});

describe("Index", () => {
    it("parseDocument", () => {
        const dom = parseDocument("<a foo><b><c><?foo>Yay!");
        expect(dom).toMatchSnapshot();
    });

    it("parseDocument in foreign content", () => {
        const dom = parseDocument("<svg><![CDATA[a<b]]></svg>");
        expect(dom).toMatchSnapshot();
    });

    /*
     * In HTML mode, `<![CDATA[` outside foreign content is a bogus comment that
     * ends at the first `>` (WHATWG HTML §13.2.5.42/§13.2.5.43), so the markup
     * after `>` stays live. parse5 and every browser produce the comment plus a
     * live `<img>`; htmlparser2 used to swallow it all into one comment.
     */
    it("treats `<![CDATA[` in HTML mode as a bogus comment ending at `>`", () => {
        const dom = parseDocument("<![CDATA[x><img src=x onerror=alert(1)>");

        expect(dom.children).toHaveLength(2);

        const [comment, img] = dom.children;
        expect(comment.type).toBe("comment");
        expect((comment as { data: string }).data).toBe("[CDATA[x");

        expect(img.type).toBe("tag");
        expect((img as Element).name).toBe("img");
        expect((img as Element).attribs).toEqual({
            src: "x",
            onerror: "alert(1)",
        });
    });

    it("keeps real CDATA in foreign content (regression guard)", () => {
        const dom = parseDocument("<svg><![CDATA[a<b]]></svg>");
        const svg = dom.children[0] as Element;
        expect(svg.name).toBe("svg");
        expect(svg.children).toHaveLength(1);
        const text = svg.children[0];
        expect(text.type).toBe("text");
        expect((text as { data: string }).data).toBe("a<b");
    });

    it("keeps real CDATA in xmlMode (regression guard)", () => {
        const dom = parseDocument("<root><![CDATA[a<b]]></root>", {
            xmlMode: true,
        });
        const root = dom.children[0] as Element;
        const cdata = root.children[0];
        expect(cdata.type).toBe("cdata");
        expect((cdata as Element).children[0]).toMatchObject({
            type: "text",
            data: "a<b",
        });
    });

    it("createDocumentStream", () => {
        let documentStream!: Parser;

        const documentPromise = new Promise((resolve, reject) => {
            documentStream = createDocumentStream((error, dom) =>
                error ? reject(error) : resolve(dom),
            );
        });

        for (const c of "&amp;This is text<!-- and comments --><tags>") {
            documentStream.write(c);
        }

        documentStream.end();

        return expect(documentPromise).resolves.toMatchSnapshot();
    });

    describe("API", () => {
        it("should export the appropriate APIs", () => {
            expect(DomHandler).toEqual(DefaultHandler);
        });
    });
});
