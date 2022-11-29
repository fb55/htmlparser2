import {
    htmlDecodeTree,
    xmlDecodeTree,
    BinTrieFlags,
    determineBranch,
    replaceCodePoint,
} from "entities/lib/decode.js";

const enum CharCodes {
    Tab = 0x9, // "\t"
    NewLine = 0xa, // "\n"
    FormFeed = 0xc, // "\f"
    CarriageReturn = 0xd, // "\r"
    Space = 0x20, // " "
    ExclamationMark = 0x21, // "!"
    Number = 0x23, // "#"
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
const enum State {
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
    InAttributeValueDq, // "
    InAttributeValueSq, // '
    InAttributeValueNq,

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

function isHexDigit(c: number): boolean {
    return (
        (c >= CharCodes.UpperA && c <= CharCodes.UpperF) ||
        (c >= CharCodes.LowerA && c <= CharCodes.LowerF)
    );
}

export enum QuoteType {
    NoValue = 0,
    Unquoted = 1,
    Single = 2,
    Double = 3,
}

export interface Callbacks {
    onattribdata(start: number, endIndex: number): void;
    onattribentity(codepoint: number): void;
    onattribend(quote: QuoteType, endIndex: number): void;
    onattribname(start: number, endIndex: number): void;
    oncdata(start: number, endIndex: number, endOffset: number): void;
    onclosetag(start: number, endIndex: number): void;
    oncomment(start: number, endIndex: number, endOffset: number): void;
    ondeclaration(start: number, endIndex: number): void;
    onend(): void;
    onopentagend(endIndex: number): void;
    onopentagname(start: number, endIndex: number): void;
    onprocessinginstruction(start: number, endIndex: number): void;
    onselfclosingtag(endIndex: number): void;
    ontext(start: number, endIndex: number): void;
    ontextentity(codepoint: number): void;
}

/**
 * Sequences used to match longer strings.
 *
 * We don't have `Script`, `Style`, or `Title` here. Instead, we re-use the *End
 * sequences with an increased offset.
 */
const Sequences = {
    Cdata: new Uint8Array([0x43, 0x44, 0x41, 0x54, 0x41, 0x5b]), // CDATA[
    CdataEnd: new Uint8Array([0x5d, 0x5d, 0x3e]), // ]]>
    CommentEnd: new Uint8Array([0x2d, 0x2d, 0x3e]), // `-->`
    ScriptEnd: new Uint8Array([0x3c, 0x2f, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74]), // `</script`
    StyleEnd: new Uint8Array([0x3c, 0x2f, 0x73, 0x74, 0x79, 0x6c, 0x65]), // `</style`
    TitleEnd: new Uint8Array([0x3c, 0x2f, 0x74, 0x69, 0x74, 0x6c, 0x65]), // `</title`
};

export default class Tokenizer {
    /** The current state the tokenizer is in. */
    private state = State.Text;
    /** The read buffer. */
    private buffer = "";
    /** The beginning of the section that is currently being read. */
    private sectionStart = 0;
    /** The index within the buffer that we are currently looking at. */
    private index = 0;
    /** Some behavior, eg. when decoding entities, is done while we are in another state. This keeps track of the other state type. */
    private baseState = State.Text;
    /** For special parsing behavior inside of script and style tags. */
    private isSpecial = false;
    /** Indicates whether the tokenizer has been paused. */
    public running = true;
    /** The offset of the current buffer. */
    private offset = 0;

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
        this.index = 0;
        this.baseState = State.Text;
        this.currentSequence = undefined!;
        this.running = true;
        this.offset = 0;
    }

    public write(chunk: string): void {
        this.offset += this.buffer.length;
        this.buffer = chunk;
        this.parse();
    }

    public end(): void {
        if (this.running) this.finish();
    }

    public pause(): void {
        this.running = false;
    }

    public resume(): void {
        this.running = true;
        if (this.index < this.buffer.length + this.offset) {
            this.parse();
        }
    }

    /**
     * The current index within all of the written data.
     */
    public getIndex(): number {
        return this.index;
    }

    /**
     * The start of the current section.
     */
    public getSectionStart(): number {
        return this.sectionStart;
    }

    private stateText(c: number): void {
        if (
            c === CharCodes.Lt ||
            (!this.decodeEntities && this.fastForwardTo(CharCodes.Lt))
        ) {
            if (this.index > this.sectionStart) {
                this.cbs.ontext(this.sectionStart, this.index);
            }
            this.state = State.BeforeTagName;
            this.sectionStart = this.index;
        } else if (this.decodeEntities && c === CharCodes.Amp) {
            this.state = State.BeforeEntity;
        }
    }

    private currentSequence!: Uint8Array;
    private sequenceIndex = 0;
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
        this.state = State.InTagName;
        this.stateInTagName(c);
    }

    /** Look for an end tag. For <title> tags, also decode entities. */
    private stateInSpecialTag(c: number): void {
        if (this.sequenceIndex === this.currentSequence.length) {
            if (c === CharCodes.Gt || isWhitespace(c)) {
                const endOfText = this.index - this.currentSequence.length;

                if (this.sectionStart < endOfText) {
                    // Spoof the index so that reported locations match up.
                    const actualIndex = this.index;
                    this.index = endOfText;
                    this.cbs.ontext(this.sectionStart, endOfText);
                    this.index = actualIndex;
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
                    this.state = State.BeforeEntity;
                }
            } else if (this.fastForwardTo(CharCodes.Lt)) {
                // Outside of <title> tags, we can fast-forward.
                this.sequenceIndex = 1;
            }
        } else {
            // If we see a `<`, set the sequence index to 1; useful for eg. `<</script>`.
            this.sequenceIndex = Number(c === CharCodes.Lt);
        }
    }

    private stateCDATASequence(c: number): void {
        if (c === Sequences.Cdata[this.sequenceIndex]) {
            if (++this.sequenceIndex === Sequences.Cdata.length) {
                this.state = State.InCommentLike;
                this.currentSequence = Sequences.CdataEnd;
                this.sequenceIndex = 0;
                this.sectionStart = this.index + 1;
            }
        } else {
            this.sequenceIndex = 0;
            this.state = State.InDeclaration;
            this.stateInDeclaration(c); // Reconsume the character
        }
    }

    /**
     * When we wait for one specific character, we can speed things up
     * by skipping through the buffer until we find it.
     *
     * @returns Whether the character was found.
     */
    private fastForwardTo(c: number): boolean {
        while (++this.index < this.buffer.length + this.offset) {
            if (this.buffer.charCodeAt(this.index - this.offset) === c) {
                return true;
            }
        }

        /*
         * We increment the index at the end of the `parse` loop,
         * so set it to `buffer.length - 1` here.
         *
         * TODO: Refactor `parse` to increment index before calling states.
         */
        this.index = this.buffer.length + this.offset - 1;

        return false;
    }

    /**
     * Comments and CDATA end with `-->` and `]]>`.
     *
     * Their common qualities are:
     * - Their end sequences have a distinct character they start with.
     * - That character is then repeated, so we have to check multiple repeats.
     * - All characters but the start character of the sequence can be skipped.
     */
    private stateInCommentLike(c: number): void {
        if (c === this.currentSequence[this.sequenceIndex]) {
            if (++this.sequenceIndex === this.currentSequence.length) {
                if (this.currentSequence === Sequences.CdataEnd) {
                    this.cbs.oncdata(this.sectionStart, this.index, 2);
                } else {
                    this.cbs.oncomment(this.sectionStart, this.index, 2);
                }

                this.sequenceIndex = 0;
                this.sectionStart = this.index + 1;
                this.state = State.Text;
            }
        } else if (this.sequenceIndex === 0) {
            // Fast-forward to the first character of the sequence
            if (this.fastForwardTo(this.currentSequence[0])) {
                this.sequenceIndex = 1;
            }
        } else if (c !== this.currentSequence[this.sequenceIndex - 1]) {
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

    private startSpecial(sequence: Uint8Array, offset: number) {
        this.isSpecial = true;
        this.currentSequence = sequence;
        this.sequenceIndex = offset;
        this.state = State.SpecialStartSequence;
    }

    private stateBeforeTagName(c: number): void {
        if (c === CharCodes.ExclamationMark) {
            this.state = State.BeforeDeclaration;
            this.sectionStart = this.index + 1;
        } else if (c === CharCodes.Questionmark) {
            this.state = State.InProcessingInstruction;
            this.sectionStart = this.index + 1;
        } else if (this.isTagStartChar(c)) {
            const lower = c | 0x20;
            this.sectionStart = this.index;
            if (!this.xmlMode && lower === Sequences.TitleEnd[2]) {
                this.startSpecial(Sequences.TitleEnd, 3);
            } else {
                this.state =
                    !this.xmlMode && lower === Sequences.ScriptEnd[2]
                        ? State.BeforeSpecialS
                        : State.InTagName;
            }
        } else if (c === CharCodes.Slash) {
            this.state = State.BeforeClosingTagName;
        } else {
            this.state = State.Text;
            this.stateText(c);
        }
    }
    private stateInTagName(c: number): void {
        if (isEndOfTagSection(c)) {
            this.cbs.onopentagname(this.sectionStart, this.index);
            this.sectionStart = -1;
            this.state = State.BeforeAttributeName;
            this.stateBeforeAttributeName(c);
        }
    }
    private stateBeforeClosingTagName(c: number): void {
        if (isWhitespace(c)) {
            // Ignore
        } else if (c === CharCodes.Gt) {
            this.state = State.Text;
        } else {
            this.state = this.isTagStartChar(c)
                ? State.InClosingTagName
                : State.InSpecialComment;
            this.sectionStart = this.index;
        }
    }
    private stateInClosingTagName(c: number): void {
        if (c === CharCodes.Gt || isWhitespace(c)) {
            this.cbs.onclosetag(this.sectionStart, this.index);
            this.sectionStart = -1;
            this.state = State.AfterClosingTagName;
            this.stateAfterClosingTagName(c);
        }
    }
    private stateAfterClosingTagName(c: number): void {
        // Skip everything until ">"
        if (c === CharCodes.Gt || this.fastForwardTo(CharCodes.Gt)) {
            this.state = State.Text;
            this.sectionStart = this.index + 1;
        }
    }
    private stateBeforeAttributeName(c: number): void {
        if (c === CharCodes.Gt) {
            this.cbs.onopentagend(this.index);
            if (this.isSpecial) {
                this.state = State.InSpecialTag;
                this.sequenceIndex = 0;
            } else {
                this.state = State.Text;
            }
            this.baseState = this.state;
            this.sectionStart = this.index + 1;
        } else if (c === CharCodes.Slash) {
            this.state = State.InSelfClosingTag;
        } else if (!isWhitespace(c)) {
            this.state = State.InAttributeName;
            this.sectionStart = this.index;
        }
    }
    private stateInSelfClosingTag(c: number): void {
        if (c === CharCodes.Gt) {
            this.cbs.onselfclosingtag(this.index);
            this.state = State.Text;
            this.baseState = State.Text;
            this.sectionStart = this.index + 1;
            this.isSpecial = false; // Reset special state, in case of self-closing special tags
        } else if (!isWhitespace(c)) {
            this.state = State.BeforeAttributeName;
            this.stateBeforeAttributeName(c);
        }
    }
    private stateInAttributeName(c: number): void {
        if (c === CharCodes.Eq || isEndOfTagSection(c)) {
            this.cbs.onattribname(this.sectionStart, this.index);
            this.sectionStart = -1;
            this.state = State.AfterAttributeName;
            this.stateAfterAttributeName(c);
        }
    }
    private stateAfterAttributeName(c: number): void {
        if (c === CharCodes.Eq) {
            this.state = State.BeforeAttributeValue;
        } else if (c === CharCodes.Slash || c === CharCodes.Gt) {
            this.cbs.onattribend(QuoteType.NoValue, this.index);
            this.state = State.BeforeAttributeName;
            this.stateBeforeAttributeName(c);
        } else if (!isWhitespace(c)) {
            this.cbs.onattribend(QuoteType.NoValue, this.index);
            this.state = State.InAttributeName;
            this.sectionStart = this.index;
        }
    }
    private stateBeforeAttributeValue(c: number): void {
        if (c === CharCodes.DoubleQuote) {
            this.state = State.InAttributeValueDq;
            this.sectionStart = this.index + 1;
        } else if (c === CharCodes.SingleQuote) {
            this.state = State.InAttributeValueSq;
            this.sectionStart = this.index + 1;
        } else if (!isWhitespace(c)) {
            this.sectionStart = this.index;
            this.state = State.InAttributeValueNq;
            this.stateInAttributeValueNoQuotes(c); // Reconsume token
        }
    }
    private handleInAttributeValue(c: number, quote: number) {
        if (
            c === quote ||
            (!this.decodeEntities && this.fastForwardTo(quote))
        ) {
            this.cbs.onattribdata(this.sectionStart, this.index);
            this.sectionStart = -1;
            this.cbs.onattribend(
                quote === CharCodes.DoubleQuote
                    ? QuoteType.Double
                    : QuoteType.Single,
                this.index
            );
            this.state = State.BeforeAttributeName;
        } else if (this.decodeEntities && c === CharCodes.Amp) {
            this.baseState = this.state;
            this.state = State.BeforeEntity;
        }
    }
    private stateInAttributeValueDoubleQuotes(c: number): void {
        this.handleInAttributeValue(c, CharCodes.DoubleQuote);
    }
    private stateInAttributeValueSingleQuotes(c: number): void {
        this.handleInAttributeValue(c, CharCodes.SingleQuote);
    }
    private stateInAttributeValueNoQuotes(c: number): void {
        if (isWhitespace(c) || c === CharCodes.Gt) {
            this.cbs.onattribdata(this.sectionStart, this.index);
            this.sectionStart = -1;
            this.cbs.onattribend(QuoteType.Unquoted, this.index);
            this.state = State.BeforeAttributeName;
            this.stateBeforeAttributeName(c);
        } else if (this.decodeEntities && c === CharCodes.Amp) {
            this.baseState = this.state;
            this.state = State.BeforeEntity;
        }
    }
    private stateBeforeDeclaration(c: number): void {
        if (c === CharCodes.OpeningSquareBracket) {
            this.state = State.CDATASequence;
            this.sequenceIndex = 0;
        } else {
            this.state =
                c === CharCodes.Dash
                    ? State.BeforeComment
                    : State.InDeclaration;
        }
    }
    private stateInDeclaration(c: number): void {
        if (c === CharCodes.Gt || this.fastForwardTo(CharCodes.Gt)) {
            this.cbs.ondeclaration(this.sectionStart, this.index);
            this.state = State.Text;
            this.sectionStart = this.index + 1;
        }
    }
    private stateInProcessingInstruction(c: number): void {
        if (c === CharCodes.Gt || this.fastForwardTo(CharCodes.Gt)) {
            this.cbs.onprocessinginstruction(this.sectionStart, this.index);
            this.state = State.Text;
            this.sectionStart = this.index + 1;
        }
    }
    private stateBeforeComment(c: number): void {
        if (c === CharCodes.Dash) {
            this.state = State.InCommentLike;
            this.currentSequence = Sequences.CommentEnd;
            // Allow short comments (eg. <!-->)
            this.sequenceIndex = 2;
            this.sectionStart = this.index + 1;
        } else {
            this.state = State.InDeclaration;
        }
    }
    private stateInSpecialComment(c: number): void {
        if (c === CharCodes.Gt || this.fastForwardTo(CharCodes.Gt)) {
            this.cbs.oncomment(this.sectionStart, this.index, 0);
            this.state = State.Text;
            this.sectionStart = this.index + 1;
        }
    }
    private stateBeforeSpecialS(c: number): void {
        const lower = c | 0x20;
        if (lower === Sequences.ScriptEnd[3]) {
            this.startSpecial(Sequences.ScriptEnd, 4);
        } else if (lower === Sequences.StyleEnd[3]) {
            this.startSpecial(Sequences.StyleEnd, 4);
        } else {
            this.state = State.InTagName;
            this.stateInTagName(c); // Consume the token again
        }
    }

    private trieIndex = 0;
    private trieCurrent = 0;
    /** For named entities, the index of the value. For numeric entities, the code point. */
    private entityResult = 0;
    private entityExcess = 0;

    private stateBeforeEntity(c: number): void {
        // Start excess with 1 to include the '&'
        this.entityExcess = 1;
        this.entityResult = 0;

        if (c === CharCodes.Number) {
            this.state = State.BeforeNumericEntity;
        } else if (c === CharCodes.Amp) {
            // We have two `&` characters in a row. Stay in the current state.
        } else {
            this.trieIndex = 0;
            this.trieCurrent = this.entityTrie[0];
            this.state = State.InNamedEntity;
            this.stateInNamedEntity(c);
        }
    }

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
            this.index--;
            return;
        }

        this.trieCurrent = this.entityTrie[this.trieIndex];

        const masked = this.trieCurrent & BinTrieFlags.VALUE_LENGTH;

        // If the branch is a value, store it and continue
        if (masked) {
            // The mask is the number of bytes of the value, including the current byte.
            const valueLength = (masked >> 14) - 1;

            // If we have a legacy entity while parsing strictly, just skip the number of bytes
            if (!this.allowLegacyEntity() && c !== CharCodes.Semi) {
                this.trieIndex += valueLength;
            } else {
                // Add 1 as we have already incremented the excess
                const entityStart = this.index - this.entityExcess + 1;

                if (entityStart > this.sectionStart) {
                    this.emitPartial(this.sectionStart, entityStart);
                }

                // If this is a surrogate pair, consume the next two bytes
                this.entityResult = this.trieIndex;
                this.trieIndex += valueLength;
                this.entityExcess = 0;
                this.sectionStart = this.index + 1;

                if (valueLength === 0) {
                    this.emitNamedEntity();
                }
            }
        }
    }

    private emitNamedEntity(): void {
        this.state = this.baseState;

        if (this.entityResult === 0) {
            return;
        }

        const valueLength =
            (this.entityTrie[this.entityResult] & BinTrieFlags.VALUE_LENGTH) >>
            14;

        switch (valueLength) {
            case 1: {
                this.emitCodePoint(
                    this.entityTrie[this.entityResult] &
                        ~BinTrieFlags.VALUE_LENGTH
                );
                break;
            }
            case 2: {
                this.emitCodePoint(this.entityTrie[this.entityResult + 1]);
                break;
            }
            case 3: {
                this.emitCodePoint(this.entityTrie[this.entityResult + 1]);
                this.emitCodePoint(this.entityTrie[this.entityResult + 2]);
            }
        }
    }

    private stateBeforeNumericEntity(c: number): void {
        if ((c | 0x20) === CharCodes.LowerX) {
            this.entityExcess++;
            this.state = State.InHexEntity;
        } else {
            this.state = State.InNumericEntity;
            this.stateInNumericEntity(c);
        }
    }

    private emitNumericEntity(strict: boolean) {
        const entityStart = this.index - this.entityExcess - 1;
        const numberStart =
            entityStart + 2 + Number(this.state === State.InHexEntity);

        if (numberStart !== this.index) {
            // Emit leading data if any
            if (entityStart > this.sectionStart) {
                this.emitPartial(this.sectionStart, entityStart);
            }

            this.sectionStart = this.index + Number(strict);
            this.emitCodePoint(replaceCodePoint(this.entityResult));
        }
        this.state = this.baseState;
    }
    private stateInNumericEntity(c: number): void {
        if (c === CharCodes.Semi) {
            this.emitNumericEntity(true);
        } else if (isNumber(c)) {
            this.entityResult = this.entityResult * 10 + (c - CharCodes.Zero);
            this.entityExcess++;
        } else {
            if (this.allowLegacyEntity()) {
                this.emitNumericEntity(false);
            } else {
                this.state = this.baseState;
            }
            this.index--;
        }
    }
    private stateInHexEntity(c: number): void {
        if (c === CharCodes.Semi) {
            this.emitNumericEntity(true);
        } else if (isNumber(c)) {
            this.entityResult = this.entityResult * 16 + (c - CharCodes.Zero);
            this.entityExcess++;
        } else if (isHexDigit(c)) {
            this.entityResult =
                this.entityResult * 16 + ((c | 0x20) - CharCodes.LowerA + 10);
            this.entityExcess++;
        } else {
            if (this.allowLegacyEntity()) {
                this.emitNumericEntity(false);
            } else {
                this.state = this.baseState;
            }
            this.index--;
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
        // If we are inside of text or attributes, emit what we already have.
        if (this.running && this.sectionStart !== this.index) {
            if (
                this.state === State.Text ||
                (this.state === State.InSpecialTag && this.sequenceIndex === 0)
            ) {
                this.cbs.ontext(this.sectionStart, this.index);
                this.sectionStart = this.index;
            } else if (
                this.state === State.InAttributeValueDq ||
                this.state === State.InAttributeValueSq ||
                this.state === State.InAttributeValueNq
            ) {
                this.cbs.onattribdata(this.sectionStart, this.index);
                this.sectionStart = this.index;
            }
        }
    }

    private shouldContinue() {
        return this.index < this.buffer.length + this.offset && this.running;
    }

    /**
     * Iterates through the buffer, calling the function corresponding to the current state.
     *
     * States that are more likely to be hit are higher up, as a performance improvement.
     */
    private parse() {
        while (this.shouldContinue()) {
            const c = this.buffer.charCodeAt(this.index - this.offset);
            switch (this.state) {
                case State.Text: {
                    this.stateText(c);
                    break;
                }
                case State.SpecialStartSequence: {
                    this.stateSpecialStartSequence(c);
                    break;
                }
                case State.InSpecialTag: {
                    this.stateInSpecialTag(c);
                    break;
                }
                case State.CDATASequence: {
                    this.stateCDATASequence(c);
                    break;
                }
                case State.InAttributeValueDq: {
                    this.stateInAttributeValueDoubleQuotes(c);
                    break;
                }
                case State.InAttributeName: {
                    this.stateInAttributeName(c);
                    break;
                }
                case State.InCommentLike: {
                    this.stateInCommentLike(c);
                    break;
                }
                case State.InSpecialComment: {
                    this.stateInSpecialComment(c);
                    break;
                }
                case State.BeforeAttributeName: {
                    this.stateBeforeAttributeName(c);
                    break;
                }
                case State.InTagName: {
                    this.stateInTagName(c);
                    break;
                }
                case State.InClosingTagName: {
                    this.stateInClosingTagName(c);
                    break;
                }
                case State.BeforeTagName: {
                    this.stateBeforeTagName(c);
                    break;
                }
                case State.AfterAttributeName: {
                    this.stateAfterAttributeName(c);
                    break;
                }
                case State.InAttributeValueSq: {
                    this.stateInAttributeValueSingleQuotes(c);
                    break;
                }
                case State.BeforeAttributeValue: {
                    this.stateBeforeAttributeValue(c);
                    break;
                }
                case State.BeforeClosingTagName: {
                    this.stateBeforeClosingTagName(c);
                    break;
                }
                case State.AfterClosingTagName: {
                    this.stateAfterClosingTagName(c);
                    break;
                }
                case State.BeforeSpecialS: {
                    this.stateBeforeSpecialS(c);
                    break;
                }
                case State.InAttributeValueNq: {
                    this.stateInAttributeValueNoQuotes(c);
                    break;
                }
                case State.InSelfClosingTag: {
                    this.stateInSelfClosingTag(c);
                    break;
                }
                case State.InDeclaration: {
                    this.stateInDeclaration(c);
                    break;
                }
                case State.BeforeDeclaration: {
                    this.stateBeforeDeclaration(c);
                    break;
                }
                case State.BeforeComment: {
                    this.stateBeforeComment(c);
                    break;
                }
                case State.InProcessingInstruction: {
                    this.stateInProcessingInstruction(c);
                    break;
                }
                case State.InNamedEntity: {
                    this.stateInNamedEntity(c);
                    break;
                }
                case State.BeforeEntity: {
                    this.stateBeforeEntity(c);
                    break;
                }
                case State.InHexEntity: {
                    this.stateInHexEntity(c);
                    break;
                }
                case State.InNumericEntity: {
                    this.stateInNumericEntity(c);
                    break;
                }
                default: {
                    // `this._state === State.BeforeNumericEntity`
                    this.stateBeforeNumericEntity(c);
                }
            }
            this.index++;
        }
        this.cleanup();
    }

    private finish() {
        if (this.state === State.InNamedEntity) {
            this.emitNamedEntity();
        }

        // If there is remaining data, emit it in a reasonable way
        if (this.sectionStart < this.index) {
            this.handleTrailingData();
        }
        this.cbs.onend();
    }

    /** Handle any trailing data. */
    private handleTrailingData() {
        const endIndex = this.buffer.length + this.offset;
        if (this.state === State.InCommentLike) {
            if (this.currentSequence === Sequences.CdataEnd) {
                this.cbs.oncdata(this.sectionStart, endIndex, 0);
            } else {
                this.cbs.oncomment(this.sectionStart, endIndex, 0);
            }
        } else if (
            this.state === State.InNumericEntity &&
            this.allowLegacyEntity()
        ) {
            this.emitNumericEntity(false);
            // All trailing data will have been consumed
        } else if (
            this.state === State.InHexEntity &&
            this.allowLegacyEntity()
        ) {
            this.emitNumericEntity(false);
            // All trailing data will have been consumed
        } else if (
            this.state === State.InTagName ||
            this.state === State.BeforeAttributeName ||
            this.state === State.BeforeAttributeValue ||
            this.state === State.AfterAttributeName ||
            this.state === State.InAttributeName ||
            this.state === State.InAttributeValueSq ||
            this.state === State.InAttributeValueDq ||
            this.state === State.InAttributeValueNq ||
            this.state === State.InClosingTagName
        ) {
            /*
             * If we are currently in an opening or closing tag, us not calling the
             * respective callback signals that the tag should be ignored.
             */
        } else {
            this.cbs.ontext(this.sectionStart, endIndex);
        }
    }

    private emitPartial(start: number, endIndex: number): void {
        if (
            this.baseState !== State.Text &&
            this.baseState !== State.InSpecialTag
        ) {
            this.cbs.onattribdata(start, endIndex);
        } else {
            this.cbs.ontext(start, endIndex);
        }
    }
    private emitCodePoint(cp: number): void {
        if (
            this.baseState !== State.Text &&
            this.baseState !== State.InSpecialTag
        ) {
            this.cbs.onattribentity(cp);
        } else {
            this.cbs.ontextentity(cp);
        }
    }
}
