import Tokenizer from "./Tokenizer";

const formTags = new Set([
    "input",
    "option",
    "optgroup",
    "select",
    "button",
    "datalist",
    "textarea",
]);
const pTag = new Set(["p"]);
const tableSectionTags = new Set(["thead", "tbody"]);
const ddtTags = new Set(["dd", "dt"]);
const rtpTags = new Set(["rt", "rp"]);

const openImpliesClose = new Map<string, Set<string>>([
    ["tr", new Set(["tr", "th", "td"])],
    ["th", new Set(["th"])],
    ["td", new Set(["thead", "th", "td"])],
    ["body", new Set(["head", "link", "script"])],
    ["li", new Set(["li"])],
    ["p", pTag],
    ["h1", pTag],
    ["h2", pTag],
    ["h3", pTag],
    ["h4", pTag],
    ["h5", pTag],
    ["h6", pTag],
    ["select", formTags],
    ["input", formTags],
    ["output", formTags],
    ["button", formTags],
    ["datalist", formTags],
    ["textarea", formTags],
    ["option", new Set(["option"])],
    ["optgroup", new Set(["optgroup", "option"])],
    ["dd", ddtTags],
    ["dt", ddtTags],
    ["address", pTag],
    ["article", pTag],
    ["aside", pTag],
    ["blockquote", pTag],
    ["details", pTag],
    ["div", pTag],
    ["dl", pTag],
    ["fieldset", pTag],
    ["figcaption", pTag],
    ["figure", pTag],
    ["footer", pTag],
    ["form", pTag],
    ["header", pTag],
    ["hr", pTag],
    ["main", pTag],
    ["nav", pTag],
    ["ol", pTag],
    ["pre", pTag],
    ["section", pTag],
    ["table", pTag],
    ["ul", pTag],
    ["rt", rtpTags],
    ["rp", rtpTags],
    ["tbody", tableSectionTags],
    ["tfoot", tableSectionTags],
]);

const voidElements = new Set([
    "area",
    "base",
    "basefont",
    "br",
    "col",
    "command",
    "embed",
    "frame",
    "hr",
    "img",
    "input",
    "isindex",
    "keygen",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
]);

const foreignContextElements = new Set(["math", "svg"]);

const htmlIntegrationElements = new Set([
    "mi",
    "mo",
    "mn",
    "ms",
    "mtext",
    "annotation-xml",
    "foreignobject",
    "desc",
    "title",
]);

export interface ParserOptions {
    /**
     * Indicates whether special tags (`<script>`, `<style>`, and `<title>`) should get special treatment
     * and if "empty" tags (eg. `<br>`) can have children.  If `false`, the content of special tags
     * will be text only. For feeds and other XML content (documents that don't consist of HTML),
     * set this to `true`.
     *
     * @default false
     */
    xmlMode?: boolean;

    /**
     * Decode entities within the document.
     *
     * @default true
     */
    decodeEntities?: boolean;

    /**
     * If set to true, all tags will be lowercased.
     *
     * @default !xmlMode
     */
    lowerCaseTags?: boolean;

    /**
     * If set to `true`, all attribute names will be lowercased. This has noticeable impact on speed.
     *
     * @default !xmlMode
     */
    lowerCaseAttributeNames?: boolean;

    /**
     * If set to true, CDATA sections will be recognized as text even if the xmlMode option is not enabled.
     * NOTE: If xmlMode is set to `true` then CDATA sections will always be recognized as text.
     *
     * @default xmlMode
     */
    recognizeCDATA?: boolean;

    /**
     * If set to `true`, self-closing tags will trigger the onclosetag event even if xmlMode is not set to `true`.
     * NOTE: If xmlMode is set to `true` then self-closing tags will always be recognized.
     *
     * @default xmlMode
     */
    recognizeSelfClosing?: boolean;

    /**
     * Allows the default tokenizer to be overwritten.
     */
    Tokenizer?: typeof Tokenizer;
}

export interface Handler {
    onparserinit(parser: Parser): void;

    /**
     * Resets the handler back to starting state
     */
    onreset(): void;

    /**
     * Signals the handler that parsing is done
     */
    onend(): void;
    onerror(error: Error): void;
    onclosetag(name: string, isImplied: boolean): void;
    onopentagname(name: string): void;
    /**
     *
     * @param name Name of the attribute
     * @param value Value of the attribute.
     * @param quote Quotes used around the attribute. `null` if the attribute has no quotes around the value, `undefined` if the attribute has no value.
     */
    onattribute(
        name: string,
        value: string,
        quote?: string | undefined | null
    ): void;
    onopentag(
        name: string,
        attribs: { [s: string]: string },
        isImplied: boolean
    ): void;
    ontext(data: string): void;
    oncomment(data: string): void;
    oncdatastart(): void;
    oncdataend(): void;
    oncommentend(): void;
    onprocessinginstruction(name: string, data: string): void;
}

const reNameEnd = /\s|\//;

export class Parser {
    /** The start index of the last event. */
    public startIndex = 0;
    /** The end index of the last event. */
    public endIndex = 0;
    /**
     * Store the start index of the current open tag,
     * so we can update the start index for attributes.
     */
    private openTagStart = 0;

    private tagname = "";
    private attribname = "";
    private attribvalue = "";
    private attribs: null | { [key: string]: string } = null;
    private stack: string[] = [];
    private readonly foreignContext: boolean[] = [];
    private readonly cbs: Partial<Handler>;
    private readonly lowerCaseTagNames: boolean;
    private readonly lowerCaseAttributeNames: boolean;
    private readonly tokenizer: Tokenizer;

    constructor(
        cbs?: Partial<Handler> | null,
        private readonly options: ParserOptions = {}
    ) {
        this.cbs = cbs ?? {};
        this.lowerCaseTagNames = options.lowerCaseTags ?? !options.xmlMode;
        this.lowerCaseAttributeNames =
            options.lowerCaseAttributeNames ?? !options.xmlMode;
        this.tokenizer = new (options.Tokenizer ?? Tokenizer)(
            this.options,
            this
        );
        this.cbs.onparserinit?.(this);
    }

    // Tokenizer event handlers

    /** @internal */
    ontext(data: string): void {
        const idx = this.tokenizer.getAbsoluteIndex();
        this.endIndex = idx - 1;
        this.cbs.ontext?.(data);
        this.startIndex = idx;
    }

    protected isVoidElement(name: string): boolean {
        return !this.options.xmlMode && voidElements.has(name);
    }

    /** @internal */
    onopentagname(name: string): void {
        this.endIndex = this.tokenizer.getAbsoluteIndex();

        if (this.lowerCaseTagNames) {
            name = name.toLowerCase();
        }

        this.emitOpenTag(name);
    }

    private emitOpenTag(name: string) {
        this.openTagStart = this.startIndex;
        this.tagname = name;

        const impliesClose =
            !this.options.xmlMode && openImpliesClose.get(name);

        if (impliesClose) {
            while (
                this.stack.length > 0 &&
                impliesClose.has(this.stack[this.stack.length - 1])
            ) {
                const el = this.stack.pop()!;
                this.cbs.onclosetag?.(el, true);
            }
        }
        if (!this.isVoidElement(name)) {
            this.stack.push(name);
            if (foreignContextElements.has(name)) {
                this.foreignContext.push(true);
            } else if (htmlIntegrationElements.has(name)) {
                this.foreignContext.push(false);
            }
        }
        this.cbs.onopentagname?.(name);
        if (this.cbs.onopentag) this.attribs = {};
    }

    private endOpenTag(isImplied: boolean) {
        this.startIndex = this.openTagStart;
        this.endIndex = this.tokenizer.getAbsoluteIndex();

        if (this.attribs) {
            this.cbs.onopentag?.(this.tagname, this.attribs, isImplied);
            this.attribs = null;
        }
        if (this.cbs.onclosetag && this.isVoidElement(this.tagname)) {
            this.cbs.onclosetag(this.tagname, true);
        }

        this.tagname = "";
    }

    /** @internal */
    onopentagend(): void {
        this.endOpenTag(false);

        // Set `startIndex` for next node
        this.startIndex = this.endIndex + 1;
    }

    /** @internal */
    onclosetag(name: string): void {
        this.endIndex = this.tokenizer.getAbsoluteIndex();

        if (this.lowerCaseTagNames) {
            name = name.toLowerCase();
        }

        if (
            foreignContextElements.has(name) ||
            htmlIntegrationElements.has(name)
        ) {
            this.foreignContext.pop();
        }

        if (!this.isVoidElement(name)) {
            const pos = this.stack.lastIndexOf(name);
            if (pos !== -1) {
                if (this.cbs.onclosetag) {
                    let count = this.stack.length - pos;
                    while (count--) {
                        // We know the stack has sufficient elements.
                        this.cbs.onclosetag(this.stack.pop()!, count !== 0);
                    }
                } else this.stack.length = pos;
            } else if (!this.options.xmlMode && name === "p") {
                this.emitOpenTag(name);
                this.closeCurrentTag(true);
            }
        } else if (!this.options.xmlMode && name === "br") {
            // We can't go through `emitOpenTag` here, as `br` would be implicitly closed.
            this.cbs.onopentagname?.(name);
            this.cbs.onopentag?.(name, {}, true);
            this.cbs.onclosetag?.(name, false);
        }

        // Set `startIndex` for next node
        this.startIndex = this.endIndex + 1;
    }

    /** @internal */
    onselfclosingtag(): void {
        if (
            this.options.xmlMode ||
            this.options.recognizeSelfClosing ||
            this.foreignContext[this.foreignContext.length - 1]
        ) {
            this.closeCurrentTag(false);

            // Set `startIndex` for next node
            this.startIndex = this.endIndex + 1;
        } else {
            // Ignore the fact that the tag is self-closing.
            this.onopentagend();
        }
    }

    private closeCurrentTag(isOpenImplied: boolean) {
        const name = this.tagname;
        this.endOpenTag(isOpenImplied);

        // Self-closing tags will be on the top of the stack
        if (this.stack[this.stack.length - 1] === name) {
            // If the opening tag isn't implied, the closing tag has to be implied.
            this.cbs.onclosetag?.(name, !isOpenImplied);
            this.stack.pop();
        }
    }

    /** @internal */
    onattribname(name: string): void {
        this.startIndex = this.tokenizer.getAbsoluteSectionStart();

        if (this.lowerCaseAttributeNames) {
            name = name.toLowerCase();
        }
        this.attribname = name;
    }

    /** @internal */
    onattribdata(value: string): void {
        this.attribvalue += value;
    }

    /** @internal */
    onattribend(quote: string | undefined | null): void {
        this.endIndex = this.tokenizer.getAbsoluteIndex();

        this.cbs.onattribute?.(this.attribname, this.attribvalue, quote);
        if (
            this.attribs &&
            !Object.prototype.hasOwnProperty.call(this.attribs, this.attribname)
        ) {
            this.attribs[this.attribname] = this.attribvalue;
        }
        this.attribname = "";
        this.attribvalue = "";
    }

    private getInstructionName(value: string) {
        const idx = value.search(reNameEnd);
        let name = idx < 0 ? value : value.substr(0, idx);

        if (this.lowerCaseTagNames) {
            name = name.toLowerCase();
        }

        return name;
    }

    /** @internal */
    ondeclaration(value: string): void {
        this.endIndex = this.tokenizer.getAbsoluteIndex();

        if (this.cbs.onprocessinginstruction) {
            const name = this.getInstructionName(value);
            this.cbs.onprocessinginstruction(`!${name}`, `!${value}`);
        }

        // Set `startIndex` for next node
        this.startIndex = this.endIndex + 1;
    }

    /** @internal */
    onprocessinginstruction(value: string): void {
        this.endIndex = this.tokenizer.getAbsoluteIndex();

        if (this.cbs.onprocessinginstruction) {
            const name = this.getInstructionName(value);
            this.cbs.onprocessinginstruction(`?${name}`, `?${value}`);
        }

        // Set `startIndex` for next node
        this.startIndex = this.endIndex + 1;
    }

    /** @internal */
    oncomment(value: string): void {
        this.endIndex = this.tokenizer.getAbsoluteIndex();

        this.cbs.oncomment?.(value);
        this.cbs.oncommentend?.();

        // Set `startIndex` for next node
        this.startIndex = this.endIndex + 1;
    }

    /** @internal */
    oncdata(value: string): void {
        this.endIndex = this.tokenizer.getAbsoluteIndex();

        if (this.options.xmlMode || this.options.recognizeCDATA) {
            this.cbs.oncdatastart?.();
            this.cbs.ontext?.(value);
            this.cbs.oncdataend?.();
        } else {
            this.cbs.oncomment?.(`[CDATA[${value}]]`);
            this.cbs.oncommentend?.();
        }

        // Set `startIndex` for next node
        this.startIndex = this.endIndex + 1;
    }

    /** @internal */
    onerror(err: Error): void {
        this.cbs.onerror?.(err);
    }

    /** @internal */
    onend(): void {
        if (this.cbs.onclosetag) {
            // Set the end index for all remaining tags
            this.endIndex = this.startIndex;
            for (
                let i = this.stack.length;
                i > 0;
                this.cbs.onclosetag(this.stack[--i], true)
            );
        }
        this.cbs.onend?.();
    }

    /**
     * Resets the parser to a blank state, ready to parse a new HTML document
     */
    public reset(): void {
        this.cbs.onreset?.();
        this.tokenizer.reset();
        this.tagname = "";
        this.attribname = "";
        this.attribs = null;
        this.stack = [];
        this.startIndex = 0;
        this.endIndex = 0;
        this.cbs.onparserinit?.(this);
    }

    /**
     * Resets the parser, then parses a complete document and
     * pushes it to the handler.
     *
     * @param data Document to parse.
     */
    public parseComplete(data: string): void {
        this.reset();
        this.end(data);
    }

    /**
     * Parses a chunk of data and calls the corresponding callbacks.
     *
     * @param chunk Chunk to parse.
     */
    public write(chunk: string): void {
        this.tokenizer.write(chunk);
    }

    /**
     * Parses the end of the buffer and clears the stack, calls onend.
     *
     * @param chunk Optional final chunk to parse.
     */
    public end(chunk?: string): void {
        this.tokenizer.end(chunk);
    }

    /**
     * Pauses parsing. The parser won't emit events until `resume` is called.
     */
    public pause(): void {
        this.tokenizer.pause();
    }

    /**
     * Resumes parsing after `pause` was called.
     */
    public resume(): void {
        this.tokenizer.resume();
    }

    /**
     * Alias of `write`, for backwards compatibility.
     *
     * @param chunk Chunk to parse.
     * @deprecated
     */
    public parseChunk(chunk: string): void {
        this.write(chunk);
    }
    /**
     * Alias of `end`, for backwards compatibility.
     *
     * @param chunk Optional final chunk to parse.
     * @deprecated
     */
    public done(chunk?: string): void {
        this.end(chunk);
    }
}
