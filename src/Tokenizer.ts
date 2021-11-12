import decodeCodePoint from "entities/lib/decode_codepoint";
import {
    htmlDecodeTree,
    xmlDecodeTree,
    BinTrieFlags,
    determineBranch,
} from "entities/lib/decode";

const enum CharCodes {
    Tab = 0x9, // "\t"
    NewLine = 0xa, // "\n"
    FormFeed = 0xc, // "\f"
    CarriageReturn = 0xd, // "\r"
    Space = 0x20, // " "
    ExclamationMark = 0x21, // "!"
    Num = 0x23, // "#"
    Amp = 0x26, // "&"
    SingleQuote = 0x27, // "'"
    DoubleQuote = 0x22, // '"'
    Dash = 0x2d, // "-"
    Slash = 0x2f, // "/"
    Zero = 0x30, // "0"
    Nine = 0x39, // "9"
    Semi = 0x3b, // ";"
    Lt = 0x3c, // "<"
    Eq = 0x3d, // "="
    Gt = 0x3e, // ">"
    Questionmark = 0x3f, // "?"
    UpperA = 0x41, // "A"
    LowerA = 0x61, // "a"
    UpperF = 0x46, // "F"
    LowerF = 0x66, // "f"
    UpperZ = 0x5a, // "Z"
    LowerZ = 0x7a, // "z"
    LowerX = 0x78, // "x"
    OpeningSquareBracket = 0x5b, // "["
}

/** All the states the tokenizer can be in. */
enum State {
    Text = 1,
    BeforeTagName, // After <
    InTagName,
    InSelfClosingTag,
    BeforeClosingTagName,
    InClosingTagName,
    AfterClosingTagName,

    // Attributes
    BeforeAttributeName,
    InAttributeName,
    AfterAttributeName,
    BeforeAttributeValue,
    InAttributeValueDoubleQuotes, // "
    InAttributeValueSingleQuotes, // '
    InAttributeValueNoQuotes,

    // Declarations
    BeforeDeclaration, // !
    InDeclaration,

    // Processing instructions
    InProcessingInstruction, // ?

    // Comments & CDATA
    BeforeComment,
    CDATASequence,
    InSpecialComment,
    InCommentLike,

    // Special tags
    BeforeSpecialS, // Decide if we deal with `<script` or `<style`
    SpecialStartSequence,
    InSpecialTag,

    BeforeEntity, // &
    BeforeNumericEntity, // #
    InNamedEntity,
    InNumericEntity,
    InHexEntity, // X
}

function isWhitespace(c: number): boolean {
    return (
        c === CharCodes.Space ||
        c === CharCodes.NewLine ||
        c === CharCodes.Tab ||
        c === CharCodes.FormFeed ||
        c === CharCodes.CarriageReturn
    );
}

function isEndOfTagSection(c: number): boolean {
    return c === CharCodes.Slash || c === CharCodes.Gt || isWhitespace(c);
}

function isNumber(c: number): boolean {
    return c >= CharCodes.Zero && c <= CharCodes.Nine;
}

function isASCIIAlpha(c: number): boolean {
    return (
        (c >= CharCodes.LowerA && c <= CharCodes.LowerZ) ||
        (c >= CharCodes.UpperA && c <= CharCodes.UpperZ)
    );
}

export interface Callbacks {
    onattribdata(value: string): void;
    onattribend(quote: string | undefined | null): void;
    onattribname(name: string): void;
    oncdata(data: string): void;
    onclosetag(name: string): void;
    oncomment(data: string): void;
    ondeclaration(content: string): void;
    onend(): void;
    onerror(error: Error, state?: State): void;
    onopentagend(): void;
    onopentagname(name: string): void;
    onprocessinginstruction(instruction: string): void;
    onselfclosingtag(): void;
    ontext(value: string): void;
}

/**
 * Sequences used to match longer strings.
 *
 * We don't have `Script`, `Style`, or `Title` here. Instead, we re-use the *End
 * sequences with an increased offset.
 */
const Sequences = {
    Cdata: new Uint16Array([0x43, 0x44, 0x41, 0x54, 0x41, 0x5b]), // CDATA[
    CdataEnd: new Uint16Array([0x5d, 0x5d, 0x3e]), // ]]>
    CommentEnd: new Uint16Array([0x2d, 0x2d, 0x3e]), // `-->`
    ScriptEnd: new Uint16Array([
        0x3c, 0x2f, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74,
    ]), // `</script`
    StyleEnd: new Uint16Array([0x3c, 0x2f, 0x73, 0x74, 0x79, 0x6c, 0x65]), // `</style`
    TitleEnd: new Uint16Array([0x3c, 0x2f, 0x74, 0x69, 0x74, 0x6c, 0x65]), // `</title`
};

type TokenizerStateMethod = `state${keyof typeof State}`;

function fnToState(fnName: TokenizerStateMethod): State {
    const state = State[fnName.slice(5) as keyof typeof State];

    if ((state as unknown) === undefined) {
        throw new Error("Unknown state");
    }

    return state;
}

// Decorator that will keep parsing until we change states
function state() {
    return function (
        _target: Tokenizer,
        key: TokenizerStateMethod,
        descriptor: PropertyDescriptor
    ) {
        const state = fnToState(key);

        const originalMethod: (this: Tokenizer, c: number) => void =
            descriptor.value;

        descriptor.value = function (this: Tokenizer, c: number | null) {
            if (c !== null) {
                originalMethod.call(this, c);
            } else {
                this.state = state;
            }
        };

        return descriptor;
    };
}

function stateLoop() {
    return function (
        _target: Tokenizer,
        key: TokenizerStateMethod,
        descriptor: PropertyDescriptor
    ) {
        const state = fnToState(key);

        const originalMethod: (this: Tokenizer, c: number) => void =
            descriptor.value;

        descriptor.value = function loop(this: Tokenizer, c: number | null) {
            for (this.state = state; c !== null; c = this._next()) {
                originalMethod.call(this, c);

                if (this.state !== state) {
                    return;
                }
            }
        };

        return descriptor;
    };
}

export default class Tokenizer {
    /** The current state the tokenizer is in. */
    state = State.Text;
    /** The read buffer. */
    private buffer = "";
    /** The beginning of the section that is currently being read. */
    public sectionStart = 0;
    /** The index within the buffer that we are currently looking at. */
    private _index = 0;
    /**
     * Data that has already been processed will be removed from the buffer occasionally.
     * `_bufferOffset` keeps track of how many characters have been removed, to make sure position information is accurate.
     */
    private bufferOffset = 0;
    /** Some behavior, eg. when decoding entities, is done while we are in another state. This keeps track of the other state type. */
    private baseState = State.Text;
    /** For special parsing behavior inside of script and style tags. */
    private isSpecial = false;
    /** Indicates whether the tokenizer has been paused. */
    private running = true;
    /** Indicates whether the tokenizer has finished running / `.end` has been called. */
    private ended = false;

    private readonly xmlMode: boolean;
    private readonly decodeEntities: boolean;
    private readonly entityTrie: Uint16Array;

    constructor(
        {
            xmlMode = false,
            decodeEntities = true,
        }: { xmlMode?: boolean; decodeEntities?: boolean },
        private readonly cbs: Callbacks
    ) {
        this.xmlMode = xmlMode;
        this.decodeEntities = decodeEntities;
        this.entityTrie = xmlMode ? xmlDecodeTree : htmlDecodeTree;
    }

    public reset(): void {
        this.state = State.Text;
        this.buffer = "";
        this.sectionStart = 0;
        this._index = 0;
        this.bufferOffset = 0;
        this.baseState = State.Text;
        this.currentSequence = undefined!;
        this.running = true;
        this.ended = false;
    }

    public write(chunk: string): void {
        if (this.ended) return this.cbs.onerror(Error(".write() after done!"));
        this.buffer += chunk;
        this.parse();
    }

    public end(chunk?: string): void {
        if (this.ended) return this.cbs.onerror(Error(".end() after done!"));
        if (chunk) this.write(chunk);
        this.ended = true;
        if (this.running) this.finish();
    }

    public pause(): void {
        this.running = false;
    }

    public resume(): void {
        this.running = true;
        if (this._index < this.buffer.length) {
            this.parse();
        }
        if (this.ended) {
            this.finish();
        }
    }

    /**
     * The start of the current section.
     */
    public getAbsoluteSectionStart(): number {
        return this.sectionStart + this.bufferOffset;
    }

    /**
     * The current index within all of the written data.
     */
    public getAbsoluteIndex(): number {
        return this.bufferOffset + this._index;
    }

    _next(): number | null {
        return this.running && this._index + 1 < this.buffer.length
            ? this.buffer.charCodeAt(++this._index)
            : null;
    }

    @stateLoop()
    private stateText(c: number): void {
        if (c === CharCodes.Lt) {
            if (this._index > this.sectionStart) {
                this.cbs.ontext(this.getSection());
            }
            this.sectionStart = this._index;
            this.stateBeforeTagName(this._next()!);
        } else if (this.decodeEntities && c === CharCodes.Amp) {
            this.stateBeforeEntity(this._next()!);
        }
    }

    private currentSequence!: Uint16Array;
    private sequenceIndex = 0;
    @stateLoop()
    private stateSpecialStartSequence(c: number): void {
        const isEnd = this.sequenceIndex === this.currentSequence.length;
        const isMatch = isEnd
            ? // If we are at the end of the sequence, make sure the tag name has ended
              isEndOfTagSection(c)
            : // Otherwise, do a case-insensitive comparison
              (c | 0x20) === this.currentSequence[this.sequenceIndex];

        if (!isMatch) {
            this.isSpecial = false;
        } else if (!isEnd) {
            this.sequenceIndex++;
            return;
        }

        this.sequenceIndex = 0;
        this.stateInTagName(c);
    }

    /** Look for an end tag. For <title> tags, also decode entities. */
    @stateLoop()
    private stateInSpecialTag(c: number): void {
        if (this.sequenceIndex === this.currentSequence.length) {
            if (c === CharCodes.Gt || isWhitespace(c)) {
                const endOfText = this._index - this.currentSequence.length;

                if (this.sectionStart < endOfText) {
                    // Spoof the index so that reported locations match up.
                    const actualIndex = this._index;
                    this._index = endOfText;
                    this.cbs.ontext(this.getSection());
                    this._index = actualIndex;
                }

                this.isSpecial = false;
                this.sectionStart = endOfText + 2; // Skip over the `</`
                this.stateInClosingTagName(c);
                return; // We are done; skip the rest of the function.
            }

            this.sequenceIndex = 0;
        }

        if ((c | 0x20) === this.currentSequence[this.sequenceIndex]) {
            this.sequenceIndex += 1;
        } else if (this.sequenceIndex === 0) {
            if (this.currentSequence === Sequences.TitleEnd) {
                // We have to parse entities in <title> tags.
                if (this.decodeEntities && c === CharCodes.Amp) {
                    this.stateBeforeEntity(this._next()!);
                }
            }
        } else {
            // If we see a `<`, set the sequence index to 1; useful for eg. `<</script>`.
            this.sequenceIndex = Number(c === CharCodes.Lt);
        }
    }

    @stateLoop()
    private stateCDATASequence(c: number): void {
        if (c === Sequences.Cdata[this.sequenceIndex]) {
            if (++this.sequenceIndex === Sequences.Cdata.length) {
                this.currentSequence = Sequences.CdataEnd;
                this.sequenceIndex = 0;
                this.sectionStart = this._index + 1;
                this.stateInCommentLike(this._next()!);
            }
        } else {
            this.sequenceIndex = 0;
            this.stateInDeclaration(c); // Reconsume the character
        }
    }

    /**
     * Comments and CDATA end with `-->` and `]]>`.
     *
     * Their common qualities are:
     * - Their end sequences have a distinct character they start with.
     * - That character is then repeated, so we have to check multiple repeats.
     * - All characters but the start character of the sequence can be skipped.
     */
    @stateLoop()
    private stateInCommentLike(c: number): void {
        if (c === this.currentSequence[this.sequenceIndex]) {
            if (++this.sequenceIndex === this.currentSequence.length) {
                // Remove 2 trailing chars
                const section = this.buffer.slice(
                    this.sectionStart,
                    this._index - 2
                );

                if (this.currentSequence === Sequences.CdataEnd) {
                    this.cbs.oncdata(section);
                } else {
                    this.cbs.oncomment(section);
                }

                this.sequenceIndex = 0;
                this.sectionStart = this._index + 1;
                this.state = State.Text;
            }
        } else if (
            this.sequenceIndex !== 0 &&
            c !== this.currentSequence[this.sequenceIndex - 1]
        ) {
            // Allow long sequences, eg. --->, ]]]>
            this.sequenceIndex = 0;
        }
    }

    /**
     * HTML only allows ASCII alpha characters (a-z and A-Z) at the beginning of a tag name.
     *
     * XML allows a lot more characters here (@see https://www.w3.org/TR/REC-xml/#NT-NameStartChar).
     * We allow anything that wouldn't end the tag.
     */
    private isTagStartChar(c: number) {
        return this.xmlMode ? !isEndOfTagSection(c) : isASCIIAlpha(c);
    }

    private startSpecial(sequence: Uint16Array, offset: number) {
        this.isSpecial = true;
        this.currentSequence = sequence;
        this.sequenceIndex = offset;
        this.stateSpecialStartSequence(this._next()!);
    }

    @state()
    private stateBeforeTagName(c: number): void {
        if (c === CharCodes.ExclamationMark) {
            this.sectionStart = this._index + 1;
            this.stateBeforeDeclaration(this._next()!);
        } else if (c === CharCodes.Questionmark) {
            this.sectionStart = this._index + 1;
            this.stateInProcessingInstruction(this._next()!);
        } else if (this.isTagStartChar(c)) {
            const lower = c | 0x20;
            this.sectionStart = this._index;
            if (!this.xmlMode && lower === Sequences.TitleEnd[2]) {
                this.startSpecial(Sequences.TitleEnd, 3);
            } else if (!this.xmlMode && lower === Sequences.ScriptEnd[2]) {
                this.stateBeforeSpecialS(this._next()!);
            } else {
                this.stateInTagName(this._next()!);
            }
        } else if (c === CharCodes.Slash) {
            this.stateBeforeClosingTagName(this._next()!);
        } else {
            this.stateText(c);
        }
    }

    @stateLoop()
    private stateInTagName(c: number): void {
        if (isEndOfTagSection(c)) {
            this.cbs.onopentagname(this.getSection());
            this.sectionStart = -1;
            this.stateBeforeAttributeName(c);
        }
    }

    @stateLoop()
    private stateBeforeClosingTagName(c: number): void {
        if (isWhitespace(c)) {
            // Ignore
        } else if (c === CharCodes.Gt) {
            this.state = State.Text;
        } else {
            this.sectionStart = this._index;
            if (this.isTagStartChar(c)) {
                this.stateInClosingTagName(this._next()!);
            } else {
                this.stateInSpecialComment(this._next()!);
            }
        }
    }

    @stateLoop()
    private stateInClosingTagName(c: number): void {
        if (c === CharCodes.Gt || isWhitespace(c)) {
            this.cbs.onclosetag(this.getSection());
            this.sectionStart = -1;
            this.stateAfterClosingTagName(c);
        }
    }

    @stateLoop()
    private stateAfterClosingTagName(c: number): void {
        // Skip everything until ">"
        if (c === CharCodes.Gt) {
            this.sectionStart = this._index + 1;
            this.state = State.Text;
        }
    }

    @stateLoop()
    private stateBeforeAttributeName(c: number): void {
        if (c === CharCodes.Gt) {
            this.cbs.onopentagend();

            this.sectionStart = this._index + 1;

            if (this.isSpecial) {
                this.sequenceIndex = 0;
                this.baseState = State.InSpecialTag;
                this.stateInSpecialTag(this._next()!);
            } else {
                this.baseState = State.Text;
                this.state = State.Text;
            }
        } else if (c === CharCodes.Slash) {
            this.stateInSelfClosingTag(this._next()!);
        } else if (!isWhitespace(c)) {
            this.sectionStart = this._index;
            this.stateInAttributeName(this._next()!);
        }
    }

    @stateLoop()
    private stateInSelfClosingTag(c: number): void {
        if (c === CharCodes.Gt) {
            this.cbs.onselfclosingtag();
            this.baseState = State.Text;
            this.sectionStart = this._index + 1;
            this.isSpecial = false; // Reset special state, in case of self-closing special tags
            this.state = State.Text;
        } else if (!isWhitespace(c)) {
            this.state = State.BeforeAttributeName;
            this._index--;
        }
    }

    @stateLoop()
    private stateInAttributeName(c: number): void {
        if (c === CharCodes.Eq || isEndOfTagSection(c)) {
            this.cbs.onattribname(this.getSection());
            this.sectionStart = -1;
            this.stateAfterAttributeName(c);
        }
    }

    @stateLoop()
    private stateAfterAttributeName(c: number): void {
        if (c === CharCodes.Eq) {
            this.stateBeforeAttributeValue(this._next()!);
        } else if (c === CharCodes.Slash || c === CharCodes.Gt) {
            this.cbs.onattribend(undefined);
            this.state = State.BeforeAttributeName;
            this._index--;
        } else if (!isWhitespace(c)) {
            this.cbs.onattribend(undefined);
            this.sectionStart = this._index;
            this.state = State.InAttributeName;
        }
    }

    @stateLoop()
    private stateBeforeAttributeValue(c: number): void {
        if (c === CharCodes.DoubleQuote) {
            this.sectionStart = this._index + 1;
            this.stateInAttributeValueDoubleQuotes(this._next()!);
        } else if (c === CharCodes.SingleQuote) {
            this.sectionStart = this._index + 1;
            this.stateInAttributeValueSingleQuotes(this._next()!);
        } else if (!isWhitespace(c)) {
            this.sectionStart = this._index;
            this.stateInAttributeValueNoQuotes(c); // Reconsume token
        }
    }
    private handleInAttributeValue(c: number, quote: number) {
        if (c === quote) {
            this.cbs.onattribdata(this.getSection());
            this.sectionStart = -1;
            this.cbs.onattribend(String.fromCharCode(quote));
            this.state = State.BeforeAttributeName;
        } else if (this.decodeEntities && c === CharCodes.Amp) {
            this.baseState =
                quote === CharCodes.DoubleQuote
                    ? State.InAttributeValueDoubleQuotes
                    : State.InAttributeValueSingleQuotes;
            this.stateBeforeEntity(this._next()!);
        }
    }

    @stateLoop()
    private stateInAttributeValueDoubleQuotes(c: number): void {
        this.handleInAttributeValue(c, CharCodes.DoubleQuote);
    }

    @stateLoop()
    private stateInAttributeValueSingleQuotes(c: number): void {
        this.handleInAttributeValue(c, CharCodes.SingleQuote);
    }

    @stateLoop()
    private stateInAttributeValueNoQuotes(c: number): void {
        if (isWhitespace(c) || c === CharCodes.Gt) {
            this.cbs.onattribdata(this.getSection());
            this.sectionStart = -1;
            this.cbs.onattribend(null);
            this.state = State.BeforeAttributeName;
            this._index--;
        } else if (this.decodeEntities && c === CharCodes.Amp) {
            this.baseState = State.InAttributeValueNoQuotes;
            this.stateBeforeEntity(this._next()!);
        }
    }

    @state()
    private stateBeforeDeclaration(c: number): void {
        if (c === CharCodes.OpeningSquareBracket) {
            this.stateCDATASequence(this._next()!);
            this.sequenceIndex = 0;
        } else if (c === CharCodes.Dash) {
            this.stateBeforeComment(this._next()!);
        } else {
            this.stateInDeclaration(this._next()!);
        }
    }

    @stateLoop()
    private stateInDeclaration(c: number): void {
        if (c === CharCodes.Gt) {
            this.cbs.ondeclaration(this.getSection());

            this.sectionStart = this._index + 1;
            this.state = State.Text;
        }
    }

    @stateLoop()
    private stateInProcessingInstruction(c: number): void {
        if (c === CharCodes.Gt) {
            this.cbs.onprocessinginstruction(this.getSection());

            this.sectionStart = this._index + 1;
            this.state = State.Text;
        }
    }

    @state()
    private stateBeforeComment(c: number): void {
        if (c === CharCodes.Dash) {
            this.currentSequence = Sequences.CommentEnd;
            // Allow short comments (eg. <!-->)
            this.sequenceIndex = 2;
            this.sectionStart = this._index + 1;
            this.stateInCommentLike(this._next()!);
        } else {
            this.stateInDeclaration(this._next()!);
        }
    }

    @stateLoop()
    private stateInSpecialComment(c: number): void {
        if (c === CharCodes.Gt) {
            this.cbs.oncomment(this.getSection());

            this.sectionStart = this._index + 1;
            this.state = State.Text;
        }
    }

    @state()
    private stateBeforeSpecialS(c: number): void {
        const lower = c | 0x20;
        if (lower === Sequences.ScriptEnd[3]) {
            this.startSpecial(Sequences.ScriptEnd, 4);
        } else if (lower === Sequences.StyleEnd[3]) {
            this.startSpecial(Sequences.StyleEnd, 4);
        } else {
            this.stateInTagName(c); // Consume the token again
        }
    }

    private trieIndex = 0;
    private trieCurrent = 0;
    private trieResult: string | null = null;
    private entityExcess = 0;

    @state()
    private stateBeforeEntity(c: number): void {
        // Start excess with 1 to include the '&'
        this.entityExcess = 1;

        if (c === CharCodes.Num) {
            this.stateBeforeNumericEntity(this._next()!);
        } else if (c === CharCodes.Amp) {
            // We have two `&` characters in a row. Stay in the current state.
        } else {
            this.trieIndex = 0;
            this.trieCurrent = this.entityTrie[0];
            this.trieResult = null;
            this.stateInNamedEntity(c);
        }
    }

    @stateLoop()
    private stateInNamedEntity(c: number): void {
        this.entityExcess += 1;

        this.trieIndex = determineBranch(
            this.entityTrie,
            this.trieCurrent,
            this.trieIndex + 1,
            c
        );

        if (this.trieIndex < 0) {
            this.emitNamedEntity();
            this._index--;
            return;
        }

        this.trieCurrent = this.entityTrie[this.trieIndex];

        // If the branch is a value, store it and continue
        if (this.trieCurrent & BinTrieFlags.HAS_VALUE) {
            // If we have a legacy entity while parsing strictly, just skip the number of bytes
            if (!this.allowLegacyEntity() && c !== CharCodes.Semi) {
                // No need to consider multi-byte values, as the legacy entity is always a single byte
                this.trieIndex += 1;
            } else {
                // Add 1 as we have already incremented the excess
                const entityStart = this._index - this.entityExcess + 1;

                if (entityStart > this.sectionStart) {
                    this.emitPartial(
                        this.buffer.substring(this.sectionStart, entityStart)
                    );
                }

                // If this is a surrogate pair, combine the higher bits from the node with the next byte
                this.trieResult =
                    this.trieCurrent & BinTrieFlags.MULTI_BYTE
                        ? String.fromCharCode(
                              this.entityTrie[++this.trieIndex],
                              this.entityTrie[++this.trieIndex]
                          )
                        : String.fromCharCode(
                              this.entityTrie[++this.trieIndex]
                          );
                this.entityExcess = 0;
                this.sectionStart = this._index + 1;
            }
        }
    }

    private emitNamedEntity() {
        if (this.trieResult) {
            this.emitPartial(this.trieResult);
        }

        this.state = this.baseState;
    }

    @state()
    private stateBeforeNumericEntity(c: number): void {
        if ((c | 0x20) === CharCodes.LowerX) {
            this.entityExcess++;
            this.stateInHexEntity(this._next()!);
        } else {
            this.stateInNumericEntity(c);
        }
    }

    private decodeNumericEntity(base: 10 | 16, strict: boolean) {
        const entityStart = this._index - this.entityExcess - 1;
        const numberStart = entityStart + 2 + (base >> 4);

        if (numberStart !== this._index) {
            // Emit leading data if any
            if (entityStart > this.sectionStart) {
                this.emitPartial(
                    this.buffer.substring(this.sectionStart, entityStart)
                );
            }

            // Parse entity
            const entity = this.buffer.substring(numberStart, this._index);
            const parsed = parseInt(entity, base);
            this.emitPartial(decodeCodePoint(parsed));
            this.sectionStart = this._index + Number(strict);
        }
        this.state = this.baseState;
    }

    @stateLoop()
    private stateInNumericEntity(c: number): void {
        if (c === CharCodes.Semi) {
            this.decodeNumericEntity(10, true);
        } else if (!isNumber(c)) {
            if (this.allowLegacyEntity()) {
                this.decodeNumericEntity(10, false);
            } else {
                this.state = this.baseState;
            }
            this._index--;
        } else {
            this.entityExcess++;
        }
    }

    @stateLoop()
    private stateInHexEntity(c: number): void {
        if (c === CharCodes.Semi) {
            this.decodeNumericEntity(16, true);
        } else if (
            (c < CharCodes.LowerA || c > CharCodes.LowerF) &&
            (c < CharCodes.UpperA || c > CharCodes.UpperF) &&
            !isNumber(c)
        ) {
            if (this.allowLegacyEntity()) {
                this.decodeNumericEntity(16, false);
            } else {
                this.state = this.baseState;
            }
            this._index--;
        } else {
            this.entityExcess++;
        }
    }

    private allowLegacyEntity() {
        return (
            !this.xmlMode &&
            (this.baseState === State.Text ||
                this.baseState === State.InSpecialTag)
        );
    }

    /**
     * Remove data that has already been consumed from the buffer.
     */
    private cleanup() {
        // If we are inside of text, emit what we already have.
        if (
            this.running &&
            this.sectionStart !== this._index &&
            (this.state === State.Text ||
                (this.state === State.InSpecialTag && this.sequenceIndex === 0))
        ) {
            // TODO: We could emit attribute data here as well.
            this.cbs.ontext(this.buffer.substr(this.sectionStart));
            this.sectionStart = this._index;
        }

        const start = this.sectionStart < 0 ? this._index : this.sectionStart;
        this.buffer =
            start === this.buffer.length ? "" : this.buffer.substr(start);
        this._index -= start;
        this.bufferOffset += start;

        if (this.sectionStart > 0) {
            this.sectionStart = 0;
        }
    }

    /**
     * Iterates through the buffer, calling the function corresponding to the current state.
     *
     * States that are more likely to be hit are higher up, as a performance improvement.
     */
    private parse() {
        while (this.running && this._index < this.buffer.length) {
            const c = this.buffer.charCodeAt(this._index);
            if (this.state === State.Text) {
                this.stateText(c);
            } else if (this.state === State.SpecialStartSequence) {
                this.stateSpecialStartSequence(c);
            } else if (this.state === State.InSpecialTag) {
                this.stateInSpecialTag(c);
            } else if (this.state === State.CDATASequence) {
                this.stateCDATASequence(c);
            } else if (this.state === State.InAttributeValueDoubleQuotes) {
                this.stateInAttributeValueDoubleQuotes(c);
            } else if (this.state === State.InAttributeName) {
                this.stateInAttributeName(c);
            } else if (this.state === State.InCommentLike) {
                this.stateInCommentLike(c);
            } else if (this.state === State.InSpecialComment) {
                this.stateInSpecialComment(c);
            } else if (this.state === State.BeforeAttributeName) {
                this.stateBeforeAttributeName(c);
            } else if (this.state === State.InTagName) {
                this.stateInTagName(c);
            } else if (this.state === State.InClosingTagName) {
                this.stateInClosingTagName(c);
            } else if (this.state === State.BeforeTagName) {
                this.stateBeforeTagName(c);
            } else if (this.state === State.AfterAttributeName) {
                this.stateAfterAttributeName(c);
            } else if (this.state === State.InAttributeValueSingleQuotes) {
                this.stateInAttributeValueSingleQuotes(c);
            } else if (this.state === State.BeforeAttributeValue) {
                this.stateBeforeAttributeValue(c);
            } else if (this.state === State.BeforeClosingTagName) {
                this.stateBeforeClosingTagName(c);
            } else if (this.state === State.AfterClosingTagName) {
                this.stateAfterClosingTagName(c);
            } else if (this.state === State.BeforeSpecialS) {
                this.stateBeforeSpecialS(c);
            } else if (this.state === State.InAttributeValueNoQuotes) {
                this.stateInAttributeValueNoQuotes(c);
            } else if (this.state === State.InSelfClosingTag) {
                this.stateInSelfClosingTag(c);
            } else if (this.state === State.InDeclaration) {
                this.stateInDeclaration(c);
            } else if (this.state === State.BeforeDeclaration) {
                this.stateBeforeDeclaration(c);
            } else if (this.state === State.BeforeComment) {
                this.stateBeforeComment(c);
            } else if (this.state === State.InProcessingInstruction) {
                this.stateInProcessingInstruction(c);
            } else if (this.state === State.InNamedEntity) {
                this.stateInNamedEntity(c);
            } else if (this.state === State.BeforeEntity) {
                this.stateBeforeEntity(c);
            } else if (this.state === State.InHexEntity) {
                this.stateInHexEntity(c);
            } else if (this.state === State.InNumericEntity) {
                this.stateInNumericEntity(c);
            } else {
                // `this._state === State.BeforeNumericEntity`
                this.stateBeforeNumericEntity(c);
            }
            this._index++;
        }
        this.cleanup();
    }

    private finish() {
        if (this.state === State.InNamedEntity) {
            this.emitNamedEntity();
        }

        // If there is remaining data, emit it in a reasonable way
        if (this.sectionStart < this._index) {
            this.handleTrailingData();
        }
        this.cbs.onend();
    }

    /** Handle any trailing data. */
    private handleTrailingData() {
        const data = this.buffer.substr(this.sectionStart);
        if (this.state === State.InCommentLike) {
            if (this.currentSequence === Sequences.CdataEnd) {
                this.cbs.oncdata(data);
            } else {
                this.cbs.oncomment(data);
            }
        } else if (
            this.state === State.InNumericEntity &&
            this.allowLegacyEntity()
        ) {
            this.decodeNumericEntity(10, false);
            // All trailing data will have been consumed
        } else if (
            this.state === State.InHexEntity &&
            this.allowLegacyEntity()
        ) {
            this.decodeNumericEntity(16, false);
            // All trailing data will have been consumed
        } else if (
            this.state === State.InTagName ||
            this.state === State.BeforeAttributeName ||
            this.state === State.BeforeAttributeValue ||
            this.state === State.AfterAttributeName ||
            this.state === State.InAttributeName ||
            this.state === State.InAttributeValueSingleQuotes ||
            this.state === State.InAttributeValueDoubleQuotes ||
            this.state === State.InAttributeValueNoQuotes ||
            this.state === State.InClosingTagName
        ) {
            /*
             * If we are currently in an opening or closing tag, us not calling the
             * respective callback signals that the tag should be ignored.
             */
        } else {
            this.cbs.ontext(data);
        }
    }

    private getSection(): string {
        return this.buffer.substring(this.sectionStart, this._index);
    }
    private emitPartial(value: string) {
        if (
            this.baseState !== State.Text &&
            this.baseState !== State.InSpecialTag
        ) {
            this.cbs.onattribdata(value);
        } else {
            this.cbs.ontext(value);
        }
    }
}
