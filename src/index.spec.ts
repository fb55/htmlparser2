import { Element } from "domhandler";
import { describe, expect, it } from "vitest";
import {
    createDocumentStream,
    DefaultHandler,
    DomHandler,
    DomUtils as DomUtilities,
    type Parser,
    parseDocument,
} from "./index.js";

// Add an `attributes` prop to the Element for now, to make it possible for Jest to render DOM nodes.
Object.defineProperty(Element.prototype, "attributes", {
    get() {
        // eslint-disable-next-line unicorn/no-this-outside-of-class -- This prototype getter uses the receiving Element instance.
        return Object.entries(this.attribs).map(([name, value]) => ({
            name,
            value,
        }));
    },
    configurable: true,
    enumerable: false,
});

describe("Index", () => {
    it("parseDocument preserves prototype-named attributes", () => {
        const dom = parseDocument('<div __proto__="value"></div>');
        const element = dom.firstChild as Element;
        expect(Object.entries(element.attribs)).toStrictEqual([
            ["__proto__", "value"],
        ]);
        expect(DomUtilities.getOuterHTML(element)).toBe(
            '<div __proto__="value"></div>',
        );
    });

    it("parseDocument", () => {
        const dom = parseDocument("<a foo><b><c><?foo>Yay!");
        expect(dom).toMatchSnapshot();
    });

    it("parseDocument in foreign content", () => {
        const dom = parseDocument("<svg><![CDATA[a<b]]></svg>");
        expect(dom).toMatchSnapshot();
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
