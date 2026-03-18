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
