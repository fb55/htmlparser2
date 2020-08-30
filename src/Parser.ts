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

const openImpliesClose: Record<string, Set<string>> = {
    tr: new Set(["tr", "th", "td"]),
    th: new Set(["th"]),
    td: new Set(["thead", "th", "td"]),
    body: new Set(["head", "link", "script"]),
    li: new Set(["li"]),
    p: pTag,
    h1: pTag,
    h2: pTag,
    h3: pTag,
    h4: pTag,
    h5: pTag,
    h6: pTag,
    select: formTags,
    input: formTags,
    output: formTags,
    button: formTags,
    datalist: formTags,
    textarea: formTags,
    option: new Set(["option"]),
    optgroup: new Set(["optgroup", "option"]),
    dd: new Set(["dt", "dd"]),
    dt: new Set(["dt", "dd"]),
    address: pTag,
    article: pTag,
    aside: pTag,
    blockquote: pTag,
    details: pTag,
    div: pTag,
    dl: pTag,
    fieldset: pTag,
    figcaption: pTag,
    figure: pTag,
    footer: pTag,
    form: pTag,
    header: pTag,
    hr: pTag,
    main: pTag,
    nav: pTag,
    ol: pTag,
    pre: pTag,
    section: pTag,
    table: pTag,
    ul: pTag,
    rt: new Set(["rt", "rp"]),
    rp: new Set(["rt", "rp"]),
    tbody: new Set(["thead", "tbody"]),
    tfoot: new Set(["thead", "tbody"]),
};

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
    "foreignObject",
    "desc",
    "title",
]);

export interface ParserOptions {
    /**
     * Indicates whether special tags (<script>, <style>, and <title>) should get special treatment
     * and if "empty" tags (eg. <br>) can have children.  If `false`, the content of special tags
     * will be text only. For feeds and other XML content (documents that don't consist of HTML),
     * set this to `true`. Default: `false`.
     */
    xmlMode?: boolean;

    /**
     * If set to true, entities within the document will be decoded. Defaults to `false`.
     */
    decodeEntities?: boolean;

    /**
     * If set to true, all tags will be lowercased. If xmlMode is disabled, this defaults to `true`.
     */
    lowerCaseTags?: boolean;

    /**
     * If set to `true`, all attribute names will be lowercased. This has noticeable impact on speed, so it defaults to `false`.
     */
    lowerCaseAttributeNames?: boolean;

    /**
     * If set to true, CDATA sections will be recognized as text even if the xmlMode option is not enabled.
     * NOTE: If xmlMode is set to `true` then CDATA sections will always be recognized as text.
     */
    recognizeCDATA?: boolean;

    /**
     * If set to `true`, self-closing tags will trigger the onclosetag event even if xmlMode is not set to `true`.
     * NOTE: If xmlMode is set to `true` then self-closing tags will always be recognized.
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
    onclosetag(name: string): void;
    onopentagname(name: string): void;
    onattribute(name: string, value: string): void;
    onopentag(name: string, attribs: { [s: string]: string }): void;
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
    public endIndex: number | null = null;

    private tagname = "";
    private attribname = "";
    private attribvalue = "";
    private attribs: null | { [key: string]: string } = null;
    private stack: string[] = [];
    private readonly foreignContext: boolean[] = [];
    private readonly cbs: Partial<Handler>;
    private readonly options: ParserOptions;
    private readonly lowerCaseTagNames: boolean;
    private readonly lowerCaseAttributeNames: boolean;
    private readonly tokenizer: Tokenizer;

    constructor(cbs: Partial<Handler> | null, options: ParserOptions = {}) {
        this.options = options;
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

    private updatePosition(initialOffset: number) {
        if (this.endIndex === null) {
            if (this.tokenizer.sectionStart <= initialOffset) {
                this.startIndex = 0;
            } else {
                this.startIndex = this.tokenizer.sectionStart - initialOffset;
            }
        } else {
            this.startIndex = this.endIndex + 1;
        }
        this.endIndex = this.tokenizer.getAbsoluteIndex();
    }

    // Tokenizer event handlers
    ontext(data: string) {
        this.updatePosition(1);
        (this.endIndex as number)--;
        this.cbs.ontext?.(data);
    }

    onopentagname(name: string) {
        if (this.lowerCaseTagNames) {
            name = name.toLowerCase();
        }
        this.tagname = name;
        if (
            !this.options.xmlMode &&
            Object.prototype.hasOwnProperty.call(openImpliesClose, name)
        ) {
            let el;
            while (
                this.stack.length > 0 &&
                openImpliesClose[name].has(
                    (el = this.stack[this.stack.length - 1])
                )
            ) {
                this.onclosetag(el);
            }
        }
        if (this.options.xmlMode || !voidElements.has(name)) {
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

    onopentagend() {
        this.updatePosition(1);
        if (this.attribs) {
            this.cbs.onopentag?.(this.tagname, this.attribs);
            this.attribs = null;
        }
        if (
            !this.options.xmlMode &&
            this.cbs.onclosetag &&
            voidElements.has(this.tagname)
        ) {
            this.cbs.onclosetag(this.tagname);
        }
        this.tagname = "";
    }

    onclosetag(name: string) {
        this.updatePosition(1);
        if (this.lowerCaseTagNames) {
            name = name.toLowerCase();
        }
        if (
            foreignContextElements.has(name) ||
            htmlIntegrationElements.has(name)
        ) {
            this.foreignContext.pop();
        }
        if (
            this.stack.length &&
            (this.options.xmlMode || !voidElements.has(name))
        ) {
            let pos = this.stack.lastIndexOf(name);
            if (pos !== -1) {
                if (this.cbs.onclosetag) {
                    pos = this.stack.length - pos;
                    while (pos--) {
                        // We know the stack has sufficient elements.
                        this.cbs.onclosetag(this.stack.pop() as string);
                    }
                } else this.stack.length = pos;
            } else if (name === "p" && !this.options.xmlMode) {
                this.onopentagname(name);
                this.closeCurrentTag();
            }
        } else if (!this.options.xmlMode && (name === "br" || name === "p")) {
            this.onopentagname(name);
            this.closeCurrentTag();
        }
    }

    onselfclosingtag() {
        if (
            this.options.xmlMode ||
            this.options.recognizeSelfClosing ||
            this.foreignContext[this.foreignContext.length - 1]
        ) {
            this.closeCurrentTag();
        } else {
            this.onopentagend();
        }
    }

    private closeCurrentTag() {
        const name = this.tagname;
        this.onopentagend();
        /*
         * Self-closing tags will be on the top of the stack
         * (cheaper check than in onclosetag)
         */
        if (this.stack[this.stack.length - 1] === name) {
            this.cbs.onclosetag?.(name);
            this.stack.pop();
        }
    }

    onattribname(name: string) {
        if (this.lowerCaseAttributeNames) {
            name = name.toLowerCase();
        }
        this.attribname = name;
    }

    onattribdata(value: string) {
        this.attribvalue += value;
    }

    onattribend() {
        this.cbs.onattribute?.(this.attribname, this.attribvalue);
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

    ondeclaration(value: string) {
        if (this.cbs.onprocessinginstruction) {
            const name = this.getInstructionName(value);
            this.cbs.onprocessinginstruction(`!${name}`, `!${value}`);
        }
    }

    onprocessinginstruction(value: string) {
        if (this.cbs.onprocessinginstruction) {
            const name = this.getInstructionName(value);
            this.cbs.onprocessinginstruction(`?${name}`, `?${value}`);
        }
    }

    oncomment(value: string) {
        this.updatePosition(4);
        this.cbs.oncomment?.(value);
        this.cbs.oncommentend?.();
    }

    oncdata(value: string) {
        this.updatePosition(1);
        if (this.options.xmlMode || this.options.recognizeCDATA) {
            this.cbs.oncdatastart?.();
            this.cbs.ontext?.(value);
            this.cbs.oncdataend?.();
        } else {
            this.oncomment(`[CDATA[${value}]]`);
        }
    }

    onerror(err: Error) {
        this.cbs.onerror?.(err);
    }

    onend() {
        if (this.cbs.onclosetag) {
            for (
                let i = this.stack.length;
                i > 0;
                this.cbs.onclosetag(this.stack[--i])
            );
        }
        this.cbs.onend?.();
    }

    /**
     * Resets the parser to a blank state, ready to parse a new HTML document
     */
    public reset() {
        this.cbs.onreset?.();
        this.tokenizer.reset();
        this.tagname = "";
        this.attribname = "";
        this.attribs = null;
        this.stack = [];
        this.cbs.onparserinit?.(this);
    }

    /**
     * Parses a complete document and pushes it to the handler.
     *
     * @param data Document to parse.
     */
    public parseComplete(data: string) {
        this.reset();
        this.end(data);
    }

    /**
     * Parses a chunk of data and calls the corresponding callbacks.
     *
     * @param chunk Chunk to parse.
     */
    public write(chunk: string) {
        this.tokenizer.write(chunk);
    }

    /**
     * Parses the end of the buffer and clears the stack, calls onend.
     *
     * @param chunk Optional final chunk to parse.
     */
    public end(chunk?: string) {
        this.tokenizer.end(chunk);
    }

    /**
     * Pauses parsing. The parser won't emit events until `resume` is called.
     */
    public pause() {
        this.tokenizer.pause();
    }

    /**
     * Resumes parsing after `pause` was called.
     */
    public resume() {
        this.tokenizer.resume();
    }

    /**
     * Alias of `write`, for backwards compatibility.
     *
     * @param chunk Chunk to parse.
     * @deprecated
     */
    public parseChunk(chunk: string) {
        this.write(chunk);
    }
    /**
     * Alias of `end`, for backwards compatibility.
     *
     * @param chunk Optional final chunk to parse.
     * @deprecated
     */
    public done(chunk?: string) {
        this.end(chunk);
    }
}
