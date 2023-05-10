import {
    parseDocument,
    parseDOM,
    createDocumentStream,
    createDomStream,
    DomHandler,
    DefaultHandler,
} from "./index.js";
import { Element } from "domhandler";

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
    test("parseDocument", () => {
        const dom = parseDocument("<a foo><b><c><?foo>Yay!");
        expect(dom).toMatchSnapshot();
    });

    test("parseDOM", () => {
        const dom = parseDOM("<a foo><b><c><?foo>Yay!");
        expect(dom).toMatchSnapshot();
    });

    test("createDocumentStream", (done) => {
        const domStream = createDocumentStream((error, dom) => {
            expect(error).toBeNull();
            expect(dom).toMatchSnapshot();

            done();
        });

        for (const c of "&amp;This is text<!-- and comments --><tags>") {
            domStream.write(c);
        }

        domStream.end();
    });

    test("createDomStream", (done) => {
        const domStream = createDomStream((error, dom) => {
            expect(error).toBeNull();
            expect(dom).toMatchSnapshot();

            done();
        });

        for (const c of "&amp;This is text<!-- and comments --><tags>") {
            domStream.write(c);
        }

        domStream.end();
    });

    describe("API", () => {
        it("should export the appropriate APIs", () => {
            expect(DomHandler).toEqual(DefaultHandler);
        });
    });
});
