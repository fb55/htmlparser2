import { Parser, ParserOptions } from "./Parser.js";
export { Parser, type ParserOptions } from "./Parser.js";

import {
    DomHandler,
    DomHandlerOptions,
    ChildNode,
    Element,
    Document,
} from "domhandler";

export {
    DomHandler,
    // Old name for DomHandler
    DomHandler as DefaultHandler,
    type DomHandlerOptions,
} from "domhandler";

export type Options = ParserOptions & DomHandlerOptions;

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
export function parseDOM(data: string, options?: Options): ChildNode[] {
    return parseDocument(data, options).children;
}
/**
 * Creates a parser instance, with an attached DOM handler.
 *
 * @param callback A callback that will be called once parsing has been completed.
 * @param options Optional options for the parser and DOM builder.
 * @param elementCallback An optional callback that will be called every time a tag has been completed inside of the DOM.
 */
export function createDomStream(
    callback: (error: Error | null, dom: ChildNode[]) => void,
    options?: Options,
    elementCallback?: (element: Element) => void
): Parser {
    const handler = new DomHandler(callback, options, elementCallback);
    return new Parser(handler, options);
}

export {
    default as Tokenizer,
    type Callbacks as TokenizerCallbacks,
} from "./Tokenizer.js";

/*
 * All of the following exports exist for backwards-compatibility.
 * They should probably be removed eventually.
 */
export * as ElementType from "domelementtype";

import { getFeed, Feed } from "domutils";

export { getFeed } from "domutils";

const parseFeedDefaultOptions = { xmlMode: true };

/**
 * Parse a feed.
 *
 * @param feed The feed that should be parsed, as a string.
 * @param options Optionally, options for parsing. When using this, you should set `xmlMode` to `true`.
 */
export function parseFeed(
    feed: string,
    options: Options = parseFeedDefaultOptions
): Feed | null {
    return getFeed(parseDOM(feed, options));
}

export * as DomUtils from "domutils";
