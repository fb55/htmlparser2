import { Parser, ParserOptions } from "./Parser";
export { Parser, ParserOptions };

import {
    DomHandler,
    DomHandlerOptions,
    Node,
    Element,
    Document,
} from "domhandler";

export { DomHandler, DomHandlerOptions };

type Options = ParserOptions & DomHandlerOptions;

// Helper methods

/**
 * Parses the data, returns the resulting document.
 *
 * @param data The data that should be parsed.
 * @param options Optional options for the parser and DOM builder.
 */
export function parseDocument(data: string, options?: Options): Document {
    const handler = new DomHandler(undefined, options);
    new Parser(handler, options).end(data);
    return handler.root;
}
/**
 * Parses data, returns an array of the root nodes.
 *
 * Note that the root nodes still have a `Document` node as their parent.
 * Use `parseDocument` to get the `Document` node instead.
 *
 * @param data The data that should be parsed.
 * @param options Optional options for the parser and DOM builder.
 * @deprecated Use `parseDocument` instead.
 */
export function parseDOM(data: string, options?: Options): Node[] {
    return parseDocument(data, options).children;
}
/**
 * Creates a parser instance, with an attached DOM handler.
 *
 * @param cb A callback that will be called once parsing has been completed.
 * @param options Optional options for the parser and DOM builder.
 * @param elementCb An optional callback that will be called every time a tag has been completed inside of the DOM.
 */
export function createDomStream(
    cb: (error: Error | null, dom: Node[]) => void,
    options?: Options,
    elementCb?: (element: Element) => void
): Parser {
    const handler = new DomHandler(cb, options, elementCb);
    return new Parser(handler, options);
}

export {
    default as Tokenizer,
    Callbacks as TokenizerCallbacks,
} from "./Tokenizer";
import * as ElementType from "domelementtype";
export { ElementType };

/*
 * All of the following exports exist for backwards-compatibility.
 * They should probably be removed eventually.
 */

export * from "./FeedHandler";
export * as DomUtils from "domutils";

// Old names for Dom- & FeedHandler
export { DomHandler as DefaultHandler };
export { FeedHandler as RssHandler } from "./FeedHandler";
