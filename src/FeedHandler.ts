import DomHandler, { DomHandlerOptions, Node, Element } from "domhandler";
import * as DomUtils from "domutils";
import { Parser, ParserOptions } from "./Parser";

enum FeedItemMediaMedium {
    image,
    audio,
    video,
    document,
    executable,
}

enum FeedItemMediaExpression {
    sample,
    full,
    nonstop,
}

interface FeedItemMedia {
    url?: string;
    fileSize?: number;
    type?: string;
    medium: FeedItemMediaMedium | undefined;
    isDefault: boolean;
    expression?: FeedItemMediaExpression;
    bitrate?: number;
    framerate?: number;
    samplingrate?: number;
    channels?: number;
    duration?: number;
    height?: number;
    width?: number;
    lang?: string;
}

interface FeedItem {
    id?: string;
    title?: string;
    link?: string;
    description?: string;
    pubDate?: Date;
    media?: FeedItemMedia[];
}

interface Feed {
    type?: string;
    id?: string;
    title?: string;
    link?: string;
    description?: string;
    updated?: Date;
    author?: string;
    items?: FeedItem[];
}

// TODO: Consume data as it is coming in
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
        const feedRoot = getOneElement(isValidFeed, this.dom);

        if (!feedRoot) {
            this.handleCallback(new Error("couldn't find root of feed"));
            return;
        }

        const feed: Feed = {};

        if (feedRoot.name === "feed") {
            const childs = feedRoot.children;
            feed.type = "atom";
            addConditionally(feed, "id", "id", childs);
            addConditionally(feed, "title", "title", childs);
            const href = getAttribute("href", getOneElement("link", childs));
            if (href) {
                feed.link = href;
            }
            addConditionally(feed, "description", "subtitle", childs);

            const updated = fetch("updated", childs);
            if (updated) {
                feed.updated = new Date(updated);
            }

            addConditionally(feed, "author", "email", childs, true);
            feed.items = getElements("entry", childs).map((item) => {
                const entry: FeedItem = {};
                const { children } = item;

                addConditionally(entry, "id", "id", children);
                addConditionally(entry, "title", "title", children);

                const href = getAttribute(
                    "href",
                    getOneElement("link", children)
                );
                if (href) {
                    entry.link = href;
                }

                const description =
                    fetch("summary", children) || fetch("content", children);
                if (description) {
                    entry.description = description;
                }

                const pubDate = fetch("updated", children);
                if (pubDate) {
                    entry.pubDate = new Date(pubDate);
                }

                entry.media = getMediaElements(children);

                return entry;
            });
        } else {
            const childs =
                getOneElement("channel", feedRoot.children)?.children ?? [];
            feed.type = feedRoot.name.substr(0, 3);
            feed.id = "";

            addConditionally(feed, "title", "title", childs);
            addConditionally(feed, "link", "link", childs);
            addConditionally(feed, "description", "description", childs);

            const updated = fetch("lastBuildDate", childs);
            if (updated) {
                feed.updated = new Date(updated);
            }

            addConditionally(feed, "author", "managingEditor", childs, true);

            feed.items = getElements("item", feedRoot.children).map(
                (item: Element) => {
                    const entry: FeedItem = {};
                    const { children } = item;
                    addConditionally(entry, "id", "guid", children);
                    addConditionally(entry, "title", "title", children);
                    addConditionally(entry, "link", "link", children);
                    addConditionally(
                        entry,
                        "description",
                        "description",
                        children
                    );
                    const pubDate = fetch("pubDate", children);
                    if (pubDate) entry.pubDate = new Date(pubDate);
                    entry.media = getMediaElements(children);
                    return entry;
                }
            );
        }

        this.feed = feed;
        this.handleCallback(null);
    }
}

function getMediaElements(where: Node | Node[]): FeedItemMedia[] {
    return getElements("media:content", where).map((elem) => {
        const media: FeedItemMedia = {
            medium: elem.attribs.medium as unknown as
                | FeedItemMediaMedium
                | undefined,
            isDefault: !!elem.attribs.isDefault,
        };

        if (elem.attribs.url) {
            media.url = elem.attribs.url;
        }
        if (elem.attribs.fileSize) {
            media.fileSize = parseInt(elem.attribs.fileSize, 10);
        }
        if (elem.attribs.type) {
            media.type = elem.attribs.type;
        }
        if (elem.attribs.expression) {
            media.expression = elem.attribs
                .expression as unknown as FeedItemMediaExpression;
        }
        if (elem.attribs.bitrate) {
            media.bitrate = parseInt(elem.attribs.bitrate, 10);
        }
        if (elem.attribs.framerate) {
            media.framerate = parseInt(elem.attribs.framerate, 10);
        }
        if (elem.attribs.samplingrate) {
            media.samplingrate = parseInt(elem.attribs.samplingrate, 10);
        }
        if (elem.attribs.channels) {
            media.channels = parseInt(elem.attribs.channels, 10);
        }
        if (elem.attribs.duration) {
            media.duration = parseInt(elem.attribs.duration, 10);
        }
        if (elem.attribs.height) {
            media.height = parseInt(elem.attribs.height, 10);
        }
        if (elem.attribs.width) {
            media.width = parseInt(elem.attribs.width, 10);
        }
        if (elem.attribs.lang) {
            media.lang = elem.attribs.lang;
        }

        return media;
    });
}

function getElements(tagName: string, where: Node | Node[]) {
    return DomUtils.getElementsByTagName(tagName, where, true);
}
function getOneElement(
    tagName: string | ((name: string) => boolean),
    node: Node | Node[]
): Element | null {
    return DomUtils.getElementsByTagName(tagName, node, true, 1)[0];
}
function fetch(tagName: string, where: Node | Node[], recurse = false): string {
    return DomUtils.getText(
        DomUtils.getElementsByTagName(tagName, where, recurse, 1)
    ).trim();
}

function getAttribute(name: string, elem: Element | null): string | null {
    if (!elem) {
        return null;
    }

    const { attribs } = elem;
    return attribs[name];
}

function addConditionally<T>(
    obj: T,
    prop: keyof T,
    what: string,
    where: Node | Node[],
    recurse = false
) {
    const tmp = fetch(what, where, recurse);
    if (tmp) obj[prop] = tmp as unknown as T[keyof T];
}

function isValidFeed(value: string) {
    return value === "rss" || value === "feed" || value === "rdf:RDF";
}

/**
 * Parse a feed.
 *
 * @param feed The feed that should be parsed, as a string.
 * @param options Optionally, options for parsing. When using this option, you should set `xmlMode` to `true`.
 */
export function parseFeed(
    feed: string,
    options: ParserOptions & DomHandlerOptions = { xmlMode: true }
): Feed | undefined {
    const handler = new FeedHandler(options);
    new Parser(handler, options).end(feed);
    return handler.feed;
}
