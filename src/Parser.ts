const { fromCodePoint } = String;

import Tokenizer, { type Callbacks, QuoteType } from "./Tokenizer.js";

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
const headingTags = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p"]);
const tableSectionTags = new Set(["thead", "tbody"]);
const ddtTags = new Set(["dd", "dt"]);
const rtpTags = new Set(["rt", "rp"]);

const openImpliesClose = new Map<string, Set<string>>([
    ["tr", new Set(["tr", "th", "td"])],
    ["th", new Set(["th"])],
    ["td", new Set(["thead", "th", "td"])],
    ["body", new Set(["head", "link", "script"])],
    ["a", new Set(["a"])],
    ["li", new Set(["li"])],
    ["p", pTag],
    ["h1", headingTags],
    ["h2", headingTags],
    ["h3", headingTags],
    ["h4", headingTags],
    ["h5", headingTags],
    ["h6", headingTags],
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

const DOCUMENT_TYPE = "doctype";

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

/**
 * Elements that can be used to integrate HTML content within foreign namespaces (e.g., SVG or MathML).
 *
 * Entries must use the SVG-adjusted casing (e.g. "foreignObject" not
 * "foreignobject") since they are compared against adjusted tag names.
 */
const htmlIntegrationElements = new Set([
    "mi",
    "mo",
    "mn",
    "ms",
    "mtext",
    "annotation-xml",
    "foreignObject",
    "desc",
    "title",
]);

const svgTagNameAdjustments = new Map<string, string>([
    ["altglyph", "altGlyph"],
    ["altglyphdef", "altGlyphDef"],
    ["altglyphitem", "altGlyphItem"],
    ["animatecolor", "animateColor"],
    ["animatemotion", "animateMotion"],
    ["animatetransform", "animateTransform"],
    ["clippath", "clipPath"],
    ["feblend", "feBlend"],
    ["fecolormatrix", "feColorMatrix"],
    ["fecomponenttransfer", "feComponentTransfer"],
    ["fecomposite", "feComposite"],
    ["feconvolvematrix", "feConvolveMatrix"],
    ["fediffuselighting", "feDiffuseLighting"],
    ["fedisplacementmap", "feDisplacementMap"],
    ["fedistantlight", "feDistantLight"],
    ["fedropshadow", "feDropShadow"],
    ["feflood", "feFlood"],
    ["fefunca", "feFuncA"],
    ["fefuncb", "feFuncB"],
    ["fefuncg", "feFuncG"],
    ["fefuncr", "feFuncR"],
    ["fegaussianblur", "feGaussianBlur"],
    ["feimage", "feImage"],
    ["femerge", "feMerge"],
    ["femergenode", "feMergeNode"],
    ["femorphology", "feMorphology"],
    ["feoffset", "feOffset"],
    ["fepointlight", "fePointLight"],
    ["fespecularlighting", "feSpecularLighting"],
    ["fespotlight", "feSpotLight"],
    ["fetile", "feTile"],
    ["feturbulence", "feTurbulence"],
    ["foreignobject", "foreignObject"],
    ["glyphref", "glyphRef"],
    ["lineargradient", "linearGradient"],
    ["radialgradient", "radialGradient"],
    ["textpath", "textPath"],
]);

const enum ForeignContext {
    None,
    Svg,
    MathML,
}

/**
 * Options for the streaming HTML/XML parser.
 */
export interface ParserOptions {
    /**
     * Indicates whether special tags (`<script>`, `<style>`, and `<title>`) should get special treatment
     * and if "empty" tags (eg. `<br>`) can have children.  If `false`, the content of special tags
     * will be text only. For feeds and other XML content (documents that don't consist of HTML),
     * set this to `true`.
     * @default false
     */
    xmlMode?: boolean;

    /**
     * Decode entities within the document.
     * @default true
     */
    decodeEntities?: boolean;

    /**
     * If set to true, all tags will be lowercased.
     * @default !xmlMode
     */
    lowerCaseTags?: boolean;

    /**
     * If set to `true`, all attribute names will be lowercased. This has noticeable impact on speed.
     * @default !xmlMode
     */
    lowerCaseAttributeNames?: boolean;

    /**
     * If set to true, CDATA sections will be recognized as text even if the xmlMode option is not enabled.
     * NOTE: If xmlMode is set to `true` then CDATA sections will always be recognized as text.
     * @default xmlMode
     */
    recognizeCDATA?: boolean;

    /**
     * If set to `true`, self-closing tags will trigger the onclosetag event even if xmlMode is not set to `true`.
     * NOTE: If xmlMode is set to `true` then self-closing tags will always be recognized.
     * @default xmlMode
     */
    recognizeSelfClosing?: boolean;

    /**
     * Allows the default tokenizer to be overwritten.
     */
    Tokenizer?: typeof Tokenizer;
}

/**
 * Parser callback interface used by the tokenizer.
 */
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
        quote?: string | undefined | null,
    ): void;
    onopentag(
        name: string,
        attribs: { [s: string]: string },
        isImplied: boolean,
    ): void;
    ontext(data: string): void;
    oncomment(data: string): void;
    oncdatastart(): void;
    oncdataend(): void;
    oncommentend(): void;
    onprocessinginstruction(name: string, data: string): void;
}

const reNameEnd = /\s|\//;

/**
 * Incremental parser implementation.
 */
export class Parser implements Callbacks {
    /** The start index of the last event. */
    startIndex = 0;
    /** The end index of the last event. */
    endIndex = 0;
    /**
     * Store the start index of the current open tag,
     * so we can update the start index for attributes.
     */
    private openTagStart = 0;

    private tagname = "";
    private attribname = "";
    private attribvalue = "";
    private attribs: null | { [key: string]: string } = null;
    private readonly stack: string[] = [];
    private readonly foreignContext: ForeignContext[];
    private readonly cbs: Partial<Handler>;
    private readonly lowerCaseTagNames: boolean;
    private readonly lowerCaseAttributeNames: boolean;
    private readonly recognizeSelfClosing: boolean;
    /** We are parsing HTML. Inverse of the `xmlMode` option. */
    private readonly htmlMode: boolean;
    private readonly tokenizer: Tokenizer;

    private readonly buffers: string[] = [];
    private bufferOffset = 0;
    /** The index of the last written buffer. Used when resuming after a `pause()`. */
    private writeIndex = 0;
    /** Indicates whether the parser has finished running / `.end` has been called. */
    private ended = false;

    constructor(
        cbs?: Partial<Handler> | null,
        private readonly options: ParserOptions = {},
    ) {
        this.cbs = cbs ?? {};
        this.htmlMode = !this.options.xmlMode;
        this.lowerCaseTagNames = options.lowerCaseTags ?? this.htmlMode;
        this.lowerCaseAttributeNames =
            options.lowerCaseAttributeNames ?? this.htmlMode;
        this.recognizeSelfClosing =
            options.recognizeSelfClosing ?? !this.htmlMode;
        this.tokenizer = new (options.Tokenizer ?? Tokenizer)(
            this.options,
            this,
        );
        this.foreignContext = [ForeignContext.None];
        this.cbs.onparserinit?.(this);
    }

    // Tokenizer event handlers

    /**
     * @param start Start index for the current parser event.
     * @param endIndex End index for the current parser event.
     * @internal
     */
    ontext(start: number, endIndex: number): void {
        const data = this.getSlice(start, endIndex);
        this.endIndex = endIndex - 1;
        this.cbs.ontext?.(data);
        this.startIndex = endIndex;
    }

    /**
     * @param cp Current Unicode code point.
     * @param endIndex End index for the current parser event.
     * @internal
     */
    ontextentity(cp: number, endIndex: number): void {
        this.endIndex = endIndex - 1;
        this.cbs.ontext?.(fromCodePoint(cp));
        this.startIndex = endIndex;
    }

    /** @internal */
    isInForeignContext(): boolean {
        return this.foreignContext[0] !== ForeignContext.None;
    }

    /**
     * Checks if the current tag is a void element. Override this if you want
     * to specify your own additional void elements.
     * @param name Name of the pseudo selector.
     */
    protected isVoidElement(name: string): boolean {
        return this.htmlMode && voidElements.has(name);
    }

    /**
     * Read a tag name from the buffer.
     *
     * When `lowerCaseTagNames` is enabled (the default in HTML mode), the name
     * is lowercased and may be adjusted for SVG casing or the `image` → `img`
     * alias.
     * @param start Start index of the tag name in the buffer.
     * @param endIndex End index of the tag name in the buffer.
     */
    private readTagName(start: number, endIndex: number): string {
        const name = this.lowerCaseTagNames
            ? this.getSlice(start, endIndex).toLowerCase()
            : this.getSlice(start, endIndex);

        if (!(this.lowerCaseTagNames && this.htmlMode)) {
            return name;
        }

        if (this.foreignContext[0] === ForeignContext.Svg) {
            return svgTagNameAdjustments.get(name) ?? name;
        }

        /*
         * Closing tags for SVG elements inside HTML integration points
         * (e.g. </foreignObject> while inside its own content) need case
         * adjustment so the name matches what was pushed to the stack.
         * `foreignContext.length > 1` means a foreign ancestor exists —
         * the base [None] entry plus at least one pushed context.
         */
        if (this.foreignContext.length > 1) {
            const adjusted = svgTagNameAdjustments.get(name);
            if (adjusted !== undefined && this.stack.includes(adjusted)) {
                return adjusted;
            }
        }

        if (!this.isInForeignContext()) {
            return name === "image" ? "img" : name;
        }

        return name;
    }

    /**
     * @param start Start index for the current parser event.
     * @param endIndex End index for the current parser event.
     * @internal
     */
    onopentagname(start: number, endIndex: number): void {
        this.endIndex = endIndex;
        this.emitOpenTag(this.readTagName(start, endIndex));
    }

    private emitOpenTag(name: string) {
        this.openTagStart = this.startIndex;
        this.tagname = name;

        /*
         * The spec ignores a second <form> when one is already open.
         * Setting tagname to "" suppresses all downstream effects: attribs
         * stays null so endOpenTag is a no-op, and closeCurrentTag can't
         * match "" on the stack.
         */
        if (this.htmlMode && name === "form" && this.stack.includes("form")) {
            this.tagname = "";
            return;
        }

        const impliesClose = this.htmlMode && openImpliesClose.get(name);

        if (impliesClose) {
            while (this.stack.length > 0 && impliesClose.has(this.stack[0])) {
                this.popElement(true);
            }
        }
        if (!this.isVoidElement(name)) {
            this.stack.unshift(name);

            if (this.htmlMode) {
                if (name === "svg") {
                    this.foreignContext.unshift(ForeignContext.Svg);
                } else if (name === "math") {
                    this.foreignContext.unshift(ForeignContext.MathML);
                } else if (htmlIntegrationElements.has(name)) {
                    this.foreignContext.unshift(ForeignContext.None);
                }
            }
        }
        this.cbs.onopentagname?.(name);
        if (this.cbs.onopentag) this.attribs = {};
    }

    private endOpenTag(isImplied: boolean) {
        this.startIndex = this.openTagStart;

        if (this.attribs) {
            this.cbs.onopentag?.(this.tagname, this.attribs, isImplied);
            this.attribs = null;
        }
        if (this.cbs.onclosetag && this.isVoidElement(this.tagname)) {
            this.cbs.onclosetag(this.tagname, true);
        }

        this.tagname = "";
    }

    /**
     * @param endIndex End index for the current parser event.
     * @internal
     */
    onopentagend(endIndex: number): void {
        this.endIndex = endIndex;
        this.endOpenTag(false);

        // Set `startIndex` for next node
        this.startIndex = endIndex + 1;
    }

    /**
     * @param start Start index for the current parser event.
     * @param endIndex End index for the current parser event.
     * @internal
     */
    onclosetag(start: number, endIndex: number): void {
        this.endIndex = endIndex;
        const name = this.readTagName(start, endIndex);

        if (!this.isVoidElement(name)) {
            const pos = this.stack.indexOf(name);
            if (pos !== -1) {
                for (let index = 0; index < pos; index++) {
                    this.popElement(true);
                }
                this.popElement(false);
            } else if (this.htmlMode && name === "p") {
                // Implicit open before close
                this.emitOpenTag("p");
                this.closeCurrentTag(true);
            }
        } else if (this.htmlMode && name === "br") {
            // We can't use `emitOpenTag` for implicit open, as `br` would be implicitly closed.
            this.cbs.onopentagname?.("br");
            this.cbs.onopentag?.("br", {}, true);
            this.cbs.onclosetag?.("br", false);
        }

        // Set `startIndex` for next node
        this.startIndex = endIndex + 1;
    }

    /**
     * @param endIndex End index for the current parser event.
     * @internal
     */
    onselfclosingtag(endIndex: number): void {
        this.endIndex = endIndex;
        if (this.recognizeSelfClosing || this.isInForeignContext()) {
            this.closeCurrentTag(false);

            // Set `startIndex` for next node
            this.startIndex = endIndex + 1;
        } else {
            // Ignore the fact that the tag is self-closing.
            this.onopentagend(endIndex);
        }
    }

    /**
     * Pop the top element off the stack, emit a close event, and maintain
     * the foreign context stack.
     * @param implied Whether this close is implied (not from an explicit end tag).
     */
    private popElement(implied: boolean): void {
        // biome-ignore lint/style/noNonNullAssertion: The element is guaranteed to exist.
        const element = this.stack.shift()!;
        if (
            this.htmlMode &&
            (foreignContextElements.has(element) ||
                htmlIntegrationElements.has(element))
        ) {
            this.foreignContext.shift();
        }
        this.cbs.onclosetag?.(element, implied);
    }

    private closeCurrentTag(isOpenImplied: boolean) {
        const name = this.tagname;
        this.endOpenTag(isOpenImplied);

        // Self-closing tags will be on the top of the stack
        if (this.stack[0] === name) {
            this.popElement(!isOpenImplied);
        }
    }

    /**
     * @param start Start index for the current parser event.
     * @param endIndex End index for the current parser event.
     * @internal
     */
    onattribname(start: number, endIndex: number): void {
        this.startIndex = start;
        const name = this.getSlice(start, endIndex);

        this.attribname = this.lowerCaseAttributeNames
            ? name.toLowerCase()
            : name;
    }

    /**
     * @param start Start index for the current parser event.
     * @param endIndex End index for the current parser event.
     * @internal
     */
    onattribdata(start: number, endIndex: number): void {
        this.attribvalue += this.getSlice(start, endIndex);
    }

    /**
     * @param cp Current Unicode code point.
     * @internal
     */
    onattribentity(cp: number): void {
        this.attribvalue += fromCodePoint(cp);
    }

    /**
     * @param quote Quote type used for the current attribute.
     * @param endIndex End index for the current parser event.
     * @internal
     */
    onattribend(quote: QuoteType, endIndex: number): void {
        this.endIndex = endIndex;

        this.cbs.onattribute?.(
            this.attribname,
            this.attribvalue,
            quote === QuoteType.Double
                ? '"'
                : quote === QuoteType.Single
                  ? "'"
                  : quote === QuoteType.NoValue
                    ? undefined
                    : null,
        );

        if (this.attribs && !Object.hasOwn(this.attribs, this.attribname)) {
            this.attribs[this.attribname] = this.attribvalue;
        }
        this.attribvalue = "";
    }

    private getInstructionName(value: string) {
        const index = value.search(reNameEnd);
        let name = index < 0 ? value : value.substr(0, index);

        if (this.lowerCaseTagNames) {
            name = name.toLowerCase();
        }

        return name;
    }

    /**
     * @param start Start index for the current parser event.
     * @param endIndex End index for the current parser event.
     * @internal
     */
    ondeclaration(start: number, endIndex: number): void {
        this.endIndex = endIndex;
        const value = this.getSlice(start, endIndex);

        if (this.cbs.onprocessinginstruction) {
            /*
             * In HTML mode, ondeclaration is only reached for DOCTYPE
             * (the tokenizer routes everything else to bogus comments).
             */
            const name = this.htmlMode
                ? this.lowerCaseTagNames
                    ? DOCUMENT_TYPE
                    : value.slice(0, DOCUMENT_TYPE.length)
                : this.getInstructionName(value);
            this.cbs.onprocessinginstruction(`!${name}`, `!${value}`);
        }

        // Set `startIndex` for next node
        this.startIndex = endIndex + 1;
    }

    /**
     * @param start Start index for the current parser event.
     * @param endIndex End index for the current parser event.
     * @internal
     */
    onprocessinginstruction(start: number, endIndex: number): void {
        this.endIndex = endIndex;
        const value = this.getSlice(start, endIndex);

        if (this.cbs.onprocessinginstruction) {
            const name = this.getInstructionName(value);
            this.cbs.onprocessinginstruction(`?${name}`, `?${value}`);
        }

        // Set `startIndex` for next node
        this.startIndex = endIndex + 1;
    }

    /**
     * @param start Start index for the current parser event.
     * @param endIndex End index for the current parser event.
     * @param offset Offset applied when computing parser indices.
     * @internal
     */
    oncomment(start: number, endIndex: number, offset: number): void {
        this.endIndex = endIndex;

        this.cbs.oncomment?.(this.getSlice(start, endIndex - offset));
        this.cbs.oncommentend?.();

        // Set `startIndex` for next node
        this.startIndex = endIndex + 1;
    }

    /**
     * @param start Start index for the current parser event.
     * @param endIndex End index for the current parser event.
     * @param offset Offset applied when computing parser indices.
     * @internal
     */
    oncdata(start: number, endIndex: number, offset: number): void {
        this.endIndex = endIndex;
        const value = this.getSlice(start, endIndex - offset);

        if (!this.htmlMode || this.options.recognizeCDATA) {
            this.cbs.oncdatastart?.();
            this.cbs.ontext?.(value);
            this.cbs.oncdataend?.();
        } else if (this.isInForeignContext()) {
            this.cbs.ontext?.(value);
        } else {
            this.cbs.oncomment?.(`[CDATA[${value}]]`);
            this.cbs.oncommentend?.();
        }

        // Set `startIndex` for next node
        this.startIndex = endIndex + 1;
    }

    /** @internal */
    onend(): void {
        if (this.cbs.onclosetag) {
            // Set the end index for all remaining tags
            this.endIndex = this.startIndex;
            for (let index = 0; index < this.stack.length; index++) {
                this.cbs.onclosetag(this.stack[index], true);
            }
        }
        this.cbs.onend?.();
    }

    /**
     * Resets the parser to a blank state, ready to parse a new HTML document
     */
    reset(): void {
        this.cbs.onreset?.();
        this.tokenizer.reset();
        this.tagname = "";
        this.attribname = "";
        this.attribvalue = "";
        this.attribs = null;
        this.stack.length = 0;
        this.startIndex = 0;
        this.endIndex = 0;
        this.cbs.onparserinit?.(this);
        this.buffers.length = 0;
        this.foreignContext.length = 0;
        this.foreignContext.unshift(ForeignContext.None);
        this.bufferOffset = 0;
        this.writeIndex = 0;
        this.ended = false;
    }

    /**
     * Resets the parser, then parses a complete document and
     * pushes it to the handler.
     * @param data Document to parse.
     */
    parseComplete(data: string): void {
        this.reset();
        this.end(data);
    }

    private getSlice(start: number, end: number) {
        if (start === end) {
            return "";
        }

        while (start - this.bufferOffset >= this.buffers[0].length) {
            this.shiftBuffer();
        }

        let slice = this.buffers[0].slice(
            start - this.bufferOffset,
            end - this.bufferOffset,
        );

        while (end - this.bufferOffset > this.buffers[0].length) {
            this.shiftBuffer();
            slice += this.buffers[0].slice(0, end - this.bufferOffset);
        }

        return slice;
    }

    private shiftBuffer(): void {
        this.bufferOffset += this.buffers[0].length;
        this.writeIndex--;
        this.buffers.shift();
    }

    /**
     * Parses a chunk of data and calls the corresponding callbacks.
     * @param chunk Chunk to parse.
     */
    write(chunk: string): void {
        if (this.ended) {
            this.cbs.onerror?.(new Error(".write() after done!"));
            return;
        }

        this.buffers.push(chunk);
        if (this.tokenizer.running) {
            this.tokenizer.write(chunk);
            this.writeIndex++;
        }
    }

    /**
     * Parses the end of the buffer and clears the stack, calls onend.
     * @param chunk Optional final chunk to parse.
     */
    end(chunk?: string): void {
        if (this.ended) {
            this.cbs.onerror?.(new Error(".end() after done!"));
            return;
        }

        if (chunk) this.write(chunk);
        this.ended = true;
        this.tokenizer.end();
    }

    /**
     * Pauses parsing. The parser won't emit events until `resume` is called.
     */
    pause(): void {
        this.tokenizer.pause();
    }

    /**
     * Resumes parsing after `pause` was called.
     */
    resume(): void {
        this.tokenizer.resume();

        while (
            this.tokenizer.running &&
            this.writeIndex < this.buffers.length
        ) {
            this.tokenizer.write(this.buffers[this.writeIndex++]);
        }

        if (this.ended) this.tokenizer.end();
    }
}
