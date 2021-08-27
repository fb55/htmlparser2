import DomHandler, { DomHandlerOptions } from "domhandler";
import { getFeed, Feed } from "domutils";
import { Parser, ParserOptions } from "./Parser";

export { getFeed };

/** @deprecated Handler is no longer necessary; use `getFeed` or `parseFeed` instead. */
export class FeedHandler extends DomHandler {
    feed?: Feed;

    /**
     *
     * @param callback
     * @param options
     */
    constructor(
        callback?: ((error: Error | null) => void) | DomHandlerOptions,
        options?: DomHandlerOptions
    ) {
        if (typeof callback === "object") {
            callback = undefined;
            options = callback;
        }
        super(callback, options);
    }

    onend(): void {
        const feed = getFeed(this.dom);

        if (feed) {
            this.feed = feed;
            this.handleCallback(null);
        } else {
            this.handleCallback(new Error("couldn't find root of feed"));
        }
    }
}

/**
 * Parse a feed.
 *
 * @param feed The feed that should be parsed, as a string.
 * @param options Optionally, options for parsing. When using this, you should set `xmlMode` to `true`.
 */
export function parseFeed(
    feed: string,
    options: ParserOptions & DomHandlerOptions = { xmlMode: true }
): Feed | null {
    const handler = new DomHandler(null, options);
    new Parser(handler, options).end(feed);
    return getFeed(handler.dom);
}
