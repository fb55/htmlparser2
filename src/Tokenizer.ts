import decodeCodePoint from "entities/lib/decode_codepoint";
import {
    htmlDecodeTree,
    xmlDecodeTree,
    BinTrieFlags,
    determineBranch,
} from "../../entities/src/decode";

const enum CharCodes {
    Tab = 0x9, // "\t"
    NewLine = 0xa, // "\n"
    FormFeed = 0xc, // "\f"
    CarriageReturn = 0xd, // "\r"
    Space = 0x20, // " "
    ExclamationMark = 0x21, // "!"
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
    UpperC = 0x43, // "C"
    LowerC = 0x63, // "c"
    UpperS = 0x53, // "S"
    LowerS = 0x73, // "s"
    UpperT = 0x54, // "T"
    LowerT = 0x74, // "t"
    UpperA = 0x41, // "A"
    LowerA = 0x61, // "a"
    UpperF = 0x46, // "F"
    LowerF = 0x66, // "f"
    UpperZ = 0x5a, // "Z"
    LowerZ = 0x7a, // "z"
    OpeningSquareBracket = 0x5b, // "["
    ClosingSquareBracket = 0x5d, // "]"
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

    // Comments
    BeforeComment,
    InComment,
    InSpecialComment,
    AfterComment1,
    AfterComment2,

    // Cdata
    BeforeCdata1, // [
    BeforeCdata2, // C
    BeforeCdata3, // D
    BeforeCdata4, // A
    BeforeCdata5, // T
    BeforeCdata6, // A
    InCdata, // [
    AfterCdata1, // ]
    AfterCdata2, // ]

    // Special tags
    BeforeSpecialS, // S
    BeforeSpecialSEnd, // S

    BeforeScript1, // C
    BeforeScript2, // R
    BeforeScript3, // I
    BeforeScript4, // P
    BeforeScript5, // T
    AfterScript1, // C
    AfterScript2, // R
    AfterScript3, // I
    AfterScript4, // P
    AfterScript5, // T

    BeforeStyle1, // T
    BeforeStyle2, // Y
    BeforeStyle3, // L
    BeforeStyle4, // E
    AfterStyle1, // T
    AfterStyle2, // Y
    AfterStyle3, // L
    AfterStyle4, // E

    BeforeSpecialT, // T
    BeforeSpecialTEnd, // T
    BeforeTitle1, // I
    BeforeTitle2, // T
    BeforeTitle3, // L
    BeforeTitle4, // E
    AfterTitle1, // I
    AfterTitle2, // T
    AfterTitle3, // L
    AfterTitle4, // E

    InEntity, // &
}

const enum Special {
    None = 1,
    Script,
    Style,
    Title,
}

function whitespace(c: number): boolean {
    return (
        c === CharCodes.Space ||
        c === CharCodes.NewLine ||
        c === CharCodes.Tab ||
        c === CharCodes.FormFeed ||
        c === CharCodes.CarriageReturn
    );
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

function ifElseState(upper: string, SUCCESS: State, FAILURE: State) {
    const upperCode = upper.charCodeAt(0);
    const lowerCode = upper.toLowerCase().charCodeAt(0);

    if (upperCode === lowerCode) {
        return (t: Tokenizer, c: number) => {
            if (c === upperCode) {
                t._state = SUCCESS;
            } else {
                t._state = FAILURE;
                t._index--;
            }
        };
    }

    return (t: Tokenizer, c: number) => {
        if (c === lowerCode || c === upperCode) {
            t._state = SUCCESS;
        } else {
            t._state = FAILURE;
            t._index--;
        }
    };
}

function consumeSpecialNameChar(upper: string, NEXT_STATE: State) {
    const upperCode = upper.charCodeAt(0);
    const lowerCode = upper.toLowerCase().charCodeAt(0);

    return (t: Tokenizer, c: number) => {
        if (c === lowerCode || c === upperCode) {
            t._state = NEXT_STATE;
        } else {
            t._state = State.InTagName;
            t._index--; // Consume the token again
        }
    };
}

const stateBeforeCdata1 = ifElseState(
    "C",
    State.BeforeCdata2,
    State.InDeclaration
);
const stateBeforeCdata2 = ifElseState(
    "D",
    State.BeforeCdata3,
    State.InDeclaration
);
const stateBeforeCdata3 = ifElseState(
    "A",
    State.BeforeCdata4,
    State.InDeclaration
);
const stateBeforeCdata4 = ifElseState(
    "T",
    State.BeforeCdata5,
    State.InDeclaration
);
const stateBeforeCdata5 = ifElseState(
    "A",
    State.BeforeCdata6,
    State.InDeclaration
);

const stateBeforeScript1 = consumeSpecialNameChar("R", State.BeforeScript2);
const stateBeforeScript2 = consumeSpecialNameChar("I", State.BeforeScript3);
const stateBeforeScript3 = consumeSpecialNameChar("P", State.BeforeScript4);
const stateBeforeScript4 = consumeSpecialNameChar("T", State.BeforeScript5);

const stateAfterScript1 = ifElseState("R", State.AfterScript2, State.Text);
const stateAfterScript2 = ifElseState("I", State.AfterScript3, State.Text);
const stateAfterScript3 = ifElseState("P", State.AfterScript4, State.Text);
const stateAfterScript4 = ifElseState("T", State.AfterScript5, State.Text);

const stateBeforeStyle1 = consumeSpecialNameChar("Y", State.BeforeStyle2);
const stateBeforeStyle2 = consumeSpecialNameChar("L", State.BeforeStyle3);
const stateBeforeStyle3 = consumeSpecialNameChar("E", State.BeforeStyle4);

const stateAfterStyle1 = ifElseState("Y", State.AfterStyle2, State.Text);
const stateAfterStyle2 = ifElseState("L", State.AfterStyle3, State.Text);
const stateAfterStyle3 = ifElseState("E", State.AfterStyle4, State.Text);

const stateBeforeSpecialT = consumeSpecialNameChar("I", State.BeforeTitle1);
const stateBeforeTitle1 = consumeSpecialNameChar("T", State.BeforeTitle2);
const stateBeforeTitle2 = consumeSpecialNameChar("L", State.BeforeTitle3);
const stateBeforeTitle3 = consumeSpecialNameChar("E", State.BeforeTitle4);

const stateAfterSpecialTEnd = ifElseState("I", State.AfterTitle1, State.Text);
const stateAfterTitle1 = ifElseState("T", State.AfterTitle2, State.Text);
const stateAfterTitle2 = ifElseState("L", State.AfterTitle3, State.Text);
const stateAfterTitle3 = ifElseState("E", State.AfterTitle4, State.Text);

export default class Tokenizer {
    /** The current state the tokenizer is in. */
    _state = State.Text;
    /** The read buffer. */
    private buffer = "";
    /** The beginning of the section that is currently being read. */
    public sectionStart = 0;
    /** The index within the buffer that we are currently looking at. */
    _index = 0;
    /**
     * Data that has already been processed will be removed from the buffer occasionally.
     * `_bufferOffset` keeps track of how many characters have been removed, to make sure position information is accurate.
     */
    private bufferOffset = 0;
    /** Some behavior, eg. when decoding entities, is done while we are in another state. This keeps track of the other state type. */
    private baseState = State.Text;
    /** For special parsing behavior inside of script and style tags. */
    private special = Special.None;
    /** Indicates whether the tokenizer has been paused. */
    private running = true;
    /** Indicates whether the tokenizer has finished running / `.end` has been called. */
    private ended = false;

    private readonly xmlMode: boolean;
    private readonly decodeEntities: boolean;
    private readonly entityTrie: Uint16Array;

    constructor(
        options: { xmlMode?: boolean; decodeEntities?: boolean } | null,
        private readonly cbs: Callbacks
    ) {
        this.cbs = cbs;
        this.xmlMode = !!options?.xmlMode;
        this.decodeEntities = options?.decodeEntities ?? true;
        this.entityTrie = this.xmlMode ? xmlDecodeTree : htmlDecodeTree;
    }

    public reset(): void {
        this._state = State.Text;
        this.buffer = "";
        this.sectionStart = 0;
        this._index = 0;
        this.bufferOffset = 0;
        this.baseState = State.Text;
        this.special = Special.None;
        this.running = true;
        this.ended = false;
    }

    public write(chunk: string): void {
        if (this.ended) this.cbs.onerror(Error(".write() after done!"));
        this.buffer += chunk;
        this.parse();
    }

    public end(chunk?: string): void {
        if (this.ended) this.cbs.onerror(Error(".end() after done!"));
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
     * The current index within all of the written data.
     */
    public getAbsoluteIndex(): number {
        return this.bufferOffset + this._index;
    }

    private stateText(c: number) {
        if (c === CharCodes.Lt) {
            if (this.sectionStart < this._index) {
                this.cbs.ontext(this.getSection());
            }
            this._state = State.BeforeTagName;
            this.sectionStart = this._index;
        } else if (
            c === CharCodes.Amp &&
            (this.special === Special.None || this.special === Special.Title)
        ) {
            this.startEntity();
        }
    }
    /**
     * HTML only allows ASCII alpha characters (a-z and A-Z) at the beginning of a tag name.
     *
     * XML allows a lot more characters here (@see https://www.w3.org/TR/REC-xml/#NT-NameStartChar).
     * We allow anything that wouldn't end the tag.
     */
    private isTagStartChar(c: number) {
        return (
            isASCIIAlpha(c) ||
            (this.xmlMode &&
                !whitespace(c) &&
                c !== CharCodes.Slash &&
                c !== CharCodes.Gt)
        );
    }
    private stateBeforeTagName(c: number) {
        if (c === CharCodes.Slash) {
            this._state = State.BeforeClosingTagName;
        } else if (c === CharCodes.Lt) {
            this.cbs.ontext(this.getSection());
            this.sectionStart = this._index;
        } else if (
            c === CharCodes.Gt ||
            this.special !== Special.None ||
            whitespace(c)
        ) {
            this._state = State.Text;
        } else if (c === CharCodes.ExclamationMark) {
            this._state = State.BeforeDeclaration;
            this.sectionStart = this._index + 1;
        } else if (c === CharCodes.Questionmark) {
            this._state = State.InProcessingInstruction;
            this.sectionStart = this._index + 1;
        } else if (!this.isTagStartChar(c)) {
            this._state = State.Text;
        } else {
            this._state =
                !this.xmlMode &&
                (c === CharCodes.LowerS || c === CharCodes.UpperS)
                    ? State.BeforeSpecialS
                    : !this.xmlMode &&
                      (c === CharCodes.LowerT || c === CharCodes.UpperT)
                    ? State.BeforeSpecialT
                    : State.InTagName;
            this.sectionStart = this._index;
        }
    }
    private stateInTagName(c: number) {
        if (c === CharCodes.Slash || c === CharCodes.Gt || whitespace(c)) {
            this.cbs.onopentagname(this.getSection());
            this.sectionStart = -1;
            this._state = State.BeforeAttributeName;
            this._index--;
        }
    }
    private stateBeforeClosingTagName(c: number) {
        if (whitespace(c)) {
            // Ignore
        } else if (c === CharCodes.Gt) {
            this._state = State.Text;
        } else if (this.special !== Special.None) {
            if (
                this.special !== Special.Title &&
                (c === CharCodes.LowerS || c === CharCodes.UpperS)
            ) {
                this._state = State.BeforeSpecialSEnd;
            } else if (
                this.special === Special.Title &&
                (c === CharCodes.LowerT || c === CharCodes.UpperT)
            ) {
                this._state = State.BeforeSpecialTEnd;
            } else {
                this._state = State.Text;
                this._index--;
            }
        } else if (!this.isTagStartChar(c)) {
            this._state = State.InSpecialComment;
            this.sectionStart = this._index;
        } else {
            this._state = State.InClosingTagName;
            this.sectionStart = this._index;
        }
    }
    private stateInClosingTagName(c: number) {
        if (c === CharCodes.Gt || whitespace(c)) {
            this.cbs.onclosetag(this.getSection());
            this.sectionStart = -1;
            this._state = State.AfterClosingTagName;
            this._index--;
        }
    }
    private stateAfterClosingTagName(c: number) {
        // Skip everything until ">"
        if (c === CharCodes.Gt) {
            this._state = State.Text;
            this.sectionStart = this._index + 1;
        }
    }
    private stateBeforeAttributeName(c: number) {
        if (c === CharCodes.Gt) {
            this.cbs.onopentagend();
            this._state = State.Text;
            this.sectionStart = this._index + 1;
        } else if (c === CharCodes.Slash) {
            this._state = State.InSelfClosingTag;
        } else if (!whitespace(c)) {
            this._state = State.InAttributeName;
            this.sectionStart = this._index;
        }
    }
    private stateInSelfClosingTag(c: number) {
        if (c === CharCodes.Gt) {
            this.cbs.onselfclosingtag();
            this._state = State.Text;
            this.sectionStart = this._index + 1;
            this.special = Special.None; // Reset special state, in case of self-closing special tags
        } else if (!whitespace(c)) {
            this._state = State.BeforeAttributeName;
            this._index--;
        }
    }
    private stateInAttributeName(c: number) {
        if (
            c === CharCodes.Eq ||
            c === CharCodes.Slash ||
            c === CharCodes.Gt ||
            whitespace(c)
        ) {
            this.cbs.onattribname(this.getSection());
            this.sectionStart = -1;
            this._state = State.AfterAttributeName;
            this._index--;
        }
    }
    private stateAfterAttributeName(c: number) {
        if (c === CharCodes.Eq) {
            this._state = State.BeforeAttributeValue;
        } else if (c === CharCodes.Slash || c === CharCodes.Gt) {
            this.cbs.onattribend(undefined);
            this._state = State.BeforeAttributeName;
            this._index--;
        } else if (!whitespace(c)) {
            this.cbs.onattribend(undefined);
            this._state = State.InAttributeName;
            this.sectionStart = this._index;
        }
    }
    private stateBeforeAttributeValue(c: number) {
        if (c === CharCodes.DoubleQuote) {
            this._state = State.InAttributeValueDq;
            this.sectionStart = this._index + 1;
        } else if (c === CharCodes.SingleQuote) {
            this._state = State.InAttributeValueSq;
            this.sectionStart = this._index + 1;
        } else if (!whitespace(c)) {
            this._state = State.InAttributeValueNq;
            this.sectionStart = this._index;
            this._index--; // Reconsume token
        }
    }
    private handleInAttributeValue(c: number, quote: number) {
        if (c === quote) {
            this.cbs.onattribdata(this.getSection());
            this.sectionStart = -1;
            this.cbs.onattribend(String.fromCharCode(quote));
            this._state = State.BeforeAttributeName;
        } else if (c === CharCodes.Amp) {
            this.startEntity();
        }
    }
    private stateInAttributeValueDoubleQuotes(c: number) {
        this.handleInAttributeValue(c, CharCodes.DoubleQuote);
    }
    private stateInAttributeValueSingleQuotes(c: number) {
        this.handleInAttributeValue(c, CharCodes.SingleQuote);
    }
    private stateInAttributeValueNoQuotes(c: number) {
        if (whitespace(c) || c === CharCodes.Gt) {
            this.cbs.onattribdata(this.getSection());
            this.sectionStart = -1;
            this.cbs.onattribend(null);
            this._state = State.BeforeAttributeName;
            this._index--;
        } else if (c === CharCodes.Amp) {
            this.startEntity();
        }
    }
    private stateBeforeDeclaration(c: number) {
        this._state =
            c === CharCodes.OpeningSquareBracket
                ? State.BeforeCdata1
                : c === CharCodes.Dash
                ? State.BeforeComment
                : State.InDeclaration;
    }
    private stateInDeclaration(c: number) {
        if (c === CharCodes.Gt) {
            this.cbs.ondeclaration(this.getSection());
            this._state = State.Text;
            this.sectionStart = this._index + 1;
        }
    }
    private stateInProcessingInstruction(c: number) {
        if (c === CharCodes.Gt) {
            this.cbs.onprocessinginstruction(this.getSection());
            this._state = State.Text;
            this.sectionStart = this._index + 1;
        }
    }
    private stateBeforeComment(c: number) {
        if (c === CharCodes.Dash) {
            this._state = State.InComment;
            this.sectionStart = this._index + 1;
        } else {
            this._state = State.InDeclaration;
        }
    }
    private stateInComment(c: number) {
        if (c === CharCodes.Dash) this._state = State.AfterComment1;
    }
    private stateInSpecialComment(c: number) {
        if (c === CharCodes.Gt) {
            this.cbs.oncomment(this.getSection());
            this._state = State.Text;
            this.sectionStart = this._index + 1;
        }
    }
    private stateAfterComment1(c: number) {
        if (c === CharCodes.Dash) {
            this._state = State.AfterComment2;
        } else {
            this._state = State.InComment;
        }
    }
    private stateAfterComment2(c: number) {
        if (c === CharCodes.Gt) {
            // Remove 2 trailing chars
            this.cbs.oncomment(
                this.buffer.substring(this.sectionStart, this._index - 2)
            );
            this._state = State.Text;
            this.sectionStart = this._index + 1;
        } else if (c !== CharCodes.Dash) {
            this._state = State.InComment;
        }
        // Else: stay in AFTER_COMMENT_2 (`--->`)
    }
    private stateBeforeCdata6(c: number) {
        if (c === CharCodes.OpeningSquareBracket) {
            this._state = State.InCdata;
            this.sectionStart = this._index + 1;
        } else {
            this._state = State.InDeclaration;
            this._index--;
        }
    }
    private stateInCdata(c: number) {
        if (c === CharCodes.ClosingSquareBracket)
            this._state = State.AfterCdata1;
    }
    private stateAfterCdata1(c: number) {
        if (c === CharCodes.ClosingSquareBracket)
            this._state = State.AfterCdata2;
        else this._state = State.InCdata;
    }
    private stateAfterCdata2(c: number) {
        if (c === CharCodes.Gt) {
            // Remove 2 trailing chars
            this.cbs.oncdata(
                this.buffer.substring(this.sectionStart, this._index - 2)
            );
            this._state = State.Text;
            this.sectionStart = this._index + 1;
        } else if (c !== CharCodes.ClosingSquareBracket) {
            this._state = State.InCdata;
        }
        // Else: stay in AFTER_CDATA_2 (`]]]>`)
    }
    private stateBeforeSpecialS(c: number) {
        if (c === CharCodes.LowerC || c === CharCodes.UpperC) {
            this._state = State.BeforeScript1;
        } else if (c === CharCodes.LowerT || c === CharCodes.UpperT) {
            this._state = State.BeforeStyle1;
        } else {
            this._state = State.InTagName;
            this._index--; // Consume the token again
        }
    }
    private stateBeforeSpecialSEnd(c: number) {
        if (
            this.special === Special.Script &&
            (c === CharCodes.LowerC || c === CharCodes.UpperC)
        ) {
            this._state = State.AfterScript1;
        } else if (
            this.special === Special.Style &&
            (c === CharCodes.LowerT || c === CharCodes.UpperT)
        ) {
            this._state = State.AfterStyle1;
        } else this._state = State.Text;
    }
    private stateBeforeSpecialLast(c: number, special: Special) {
        if (c === CharCodes.Slash || c === CharCodes.Gt || whitespace(c)) {
            this.special = special;
        }
        this._state = State.InTagName;
        this._index--; // Consume the token again
    }
    private stateAfterSpecialLast(c: number, sectionStartOffset: number) {
        if (c === CharCodes.Gt || whitespace(c)) {
            this.special = Special.None;
            this._state = State.InClosingTagName;
            this.sectionStart = this._index - sectionStartOffset;
            this._index--; // Reconsume the token
        } else this._state = State.Text;
    }
    private trieIndex = 0;
    private trieResultIndex = -1;
    private trieExcess = 0;
    private startEntity() {
        if (!this.decodeEntities) return;

        this.trieIndex = 0;
        this.trieResultIndex = -1;
        this.trieExcess = 0;
        this.baseState = this._state;
        this._state = State.InEntity;

        if (this.sectionStart < this._index) {
            this.emitPartial(this.getSection());
        }

        this.sectionStart = this._index;
    }
    private emitEntity() {
        const resultIndex = this.trieResultIndex;
        if (resultIndex < 0) return;

        const result = this.entityTrie[resultIndex];

        // If the result is a number, decode it
        if (result & BinTrieFlags.IS_NUMBER) {
            const isHex = Number(!!(result & BinTrieFlags.HEX_OR_MULTI_BYTE));
            const start = this.sectionStart + 2 + isHex;
            const entity = this.buffer.substring(
                start,
                this._index - (1 - isHex)
            );
            const parsed = parseInt(entity, isHex ? 16 : 10);

            this.emitPartial(decodeCodePoint(parsed));
            this.sectionStart = this._index;

            return;
        }

        // If this is a surrogate pair, combine the higher bits from the node with the next byte
        this.emitPartial(
            result & BinTrieFlags.HEX_OR_MULTI_BYTE
                ? String.fromCharCode(
                      this.entityTrie[resultIndex + 1],
                      this.entityTrie[resultIndex + 2]
                  )
                : String.fromCharCode(this.entityTrie[resultIndex + 1])
        );

        this.sectionStart = this._index - this.trieExcess + 1;
    }
    private stateInEntity(c: number) {
        const current = this.entityTrie[this.trieIndex];

        // If we have a byte value, we have to skip some bytes.
        const hasValue = Number(!!(current & BinTrieFlags.HAS_VALUE));
        const byteOffset =
            hasValue & (1 - Number(!!(current & BinTrieFlags.IS_NUMBER)));
        const multibyteOffset =
            byteOffset & Number(!!(current & BinTrieFlags.HEX_OR_MULTI_BYTE));

        this.trieIndex = determineBranch(
            this.entityTrie,
            current,
            this.trieIndex + 1 + byteOffset + multibyteOffset,
            c
        );

        if (this.trieIndex < 0) {
            this.emitEntity();
            return;
        }

        const branch = this.entityTrie[this.trieIndex];
        if (
            branch & BinTrieFlags.HAS_VALUE &&
            // If we have a legacy entity and we are not in HTML text mode, skip.
            !(
                !this.xmlMode &&
                this.baseState === State.Text &&
                branch & BinTrieFlags.LEGACY
            )
        ) {
            this.trieResultIndex = this.trieIndex;
            this.trieExcess = 1;
        } else {
            this.trieExcess += 1;
        }
    }

    private cleanup() {
        if (this.sectionStart < 0) {
            this.buffer = "";
            this.bufferOffset += this._index;
            this._index = 0;
        } else if (this.running) {
            if (this._state === State.Text) {
                if (this.sectionStart !== this._index) {
                    this.cbs.ontext(this.buffer.substr(this.sectionStart));
                }
                this.buffer = "";
                this.bufferOffset += this._index;
                this._index = 0;
            } else if (this.sectionStart === this._index) {
                // The section just started
                this.buffer = "";
                this.bufferOffset += this._index;
                this._index = 0;
            } else {
                // Remove everything unnecessary
                this.buffer = this.buffer.substr(this.sectionStart);
                this._index -= this.sectionStart;
                this.bufferOffset += this.sectionStart;
            }
            this.sectionStart = 0;
        }
    }

    /**
     * Iterates through the buffer, calling the function corresponding to the current state.
     *
     * States that are more likely to be hit are higher up, as a performance improvement.
     */
    private parse() {
        while (this._index < this.buffer.length && this.running) {
            const c = this.buffer.charCodeAt(this._index);
            if (this._state === State.Text) {
                this.stateText(c);
            } else if (this._state === State.InAttributeValueDq) {
                this.stateInAttributeValueDoubleQuotes(c);
            } else if (this._state === State.InAttributeName) {
                this.stateInAttributeName(c);
            } else if (this._state === State.InComment) {
                this.stateInComment(c);
            } else if (this._state === State.InSpecialComment) {
                this.stateInSpecialComment(c);
            } else if (this._state === State.BeforeAttributeName) {
                this.stateBeforeAttributeName(c);
            } else if (this._state === State.InTagName) {
                this.stateInTagName(c);
            } else if (this._state === State.InClosingTagName) {
                this.stateInClosingTagName(c);
            } else if (this._state === State.BeforeTagName) {
                this.stateBeforeTagName(c);
            } else if (this._state === State.AfterAttributeName) {
                this.stateAfterAttributeName(c);
            } else if (this._state === State.InAttributeValueSq) {
                this.stateInAttributeValueSingleQuotes(c);
            } else if (this._state === State.BeforeAttributeValue) {
                this.stateBeforeAttributeValue(c);
            } else if (this._state === State.BeforeClosingTagName) {
                this.stateBeforeClosingTagName(c);
            } else if (this._state === State.AfterClosingTagName) {
                this.stateAfterClosingTagName(c);
            } else if (this._state === State.BeforeSpecialS) {
                this.stateBeforeSpecialS(c);
            } else if (this._state === State.AfterComment1) {
                this.stateAfterComment1(c);
            } else if (this._state === State.InAttributeValueNq) {
                this.stateInAttributeValueNoQuotes(c);
            } else if (this._state === State.InSelfClosingTag) {
                this.stateInSelfClosingTag(c);
            } else if (this._state === State.InDeclaration) {
                this.stateInDeclaration(c);
            } else if (this._state === State.BeforeDeclaration) {
                this.stateBeforeDeclaration(c);
            } else if (this._state === State.AfterComment2) {
                this.stateAfterComment2(c);
            } else if (this._state === State.BeforeComment) {
                this.stateBeforeComment(c);
            } else if (this._state === State.BeforeSpecialSEnd) {
                this.stateBeforeSpecialSEnd(c);
            } else if (this._state === State.BeforeSpecialTEnd) {
                stateAfterSpecialTEnd(this, c);
            } else if (this._state === State.AfterScript1) {
                stateAfterScript1(this, c);
            } else if (this._state === State.AfterScript2) {
                stateAfterScript2(this, c);
            } else if (this._state === State.AfterScript3) {
                stateAfterScript3(this, c);
            } else if (this._state === State.BeforeScript1) {
                stateBeforeScript1(this, c);
            } else if (this._state === State.BeforeScript2) {
                stateBeforeScript2(this, c);
            } else if (this._state === State.BeforeScript3) {
                stateBeforeScript3(this, c);
            } else if (this._state === State.BeforeScript4) {
                stateBeforeScript4(this, c);
            } else if (this._state === State.BeforeScript5) {
                this.stateBeforeSpecialLast(c, Special.Script);
            } else if (this._state === State.AfterScript4) {
                stateAfterScript4(this, c);
            } else if (this._state === State.AfterScript5) {
                this.stateAfterSpecialLast(c, 6);
            } else if (this._state === State.BeforeStyle1) {
                stateBeforeStyle1(this, c);
            } else if (this._state === State.InCdata) {
                this.stateInCdata(c);
            } else if (this._state === State.BeforeStyle2) {
                stateBeforeStyle2(this, c);
            } else if (this._state === State.BeforeStyle3) {
                stateBeforeStyle3(this, c);
            } else if (this._state === State.BeforeStyle4) {
                this.stateBeforeSpecialLast(c, Special.Style);
            } else if (this._state === State.AfterStyle1) {
                stateAfterStyle1(this, c);
            } else if (this._state === State.AfterStyle2) {
                stateAfterStyle2(this, c);
            } else if (this._state === State.AfterStyle3) {
                stateAfterStyle3(this, c);
            } else if (this._state === State.AfterStyle4) {
                this.stateAfterSpecialLast(c, 5);
            } else if (this._state === State.BeforeSpecialT) {
                stateBeforeSpecialT(this, c);
            } else if (this._state === State.BeforeTitle1) {
                stateBeforeTitle1(this, c);
            } else if (this._state === State.BeforeTitle2) {
                stateBeforeTitle2(this, c);
            } else if (this._state === State.BeforeTitle3) {
                stateBeforeTitle3(this, c);
            } else if (this._state === State.BeforeTitle4) {
                this.stateBeforeSpecialLast(c, Special.Title);
            } else if (this._state === State.AfterTitle1) {
                stateAfterTitle1(this, c);
            } else if (this._state === State.AfterTitle2) {
                stateAfterTitle2(this, c);
            } else if (this._state === State.AfterTitle3) {
                stateAfterTitle3(this, c);
            } else if (this._state === State.AfterTitle4) {
                this.stateAfterSpecialLast(c, 5);
            } else if (this._state === State.InProcessingInstruction) {
                this.stateInProcessingInstruction(c);
            } else if (this._state === State.InEntity) {
                this.stateInEntity(c);
            } else if (this._state === State.BeforeCdata1) {
                stateBeforeCdata1(this, c);
            } else if (this._state === State.BeforeCdata2) {
                stateBeforeCdata2(this, c);
            } else if (this._state === State.BeforeCdata3) {
                stateBeforeCdata3(this, c);
            } else if (this._state === State.AfterCdata1) {
                this.stateAfterCdata1(c);
            } else if (this._state === State.AfterCdata2) {
                this.stateAfterCdata2(c);
            } else if (this._state === State.BeforeCdata4) {
                stateBeforeCdata4(this, c);
            } else if (this._state === State.BeforeCdata5) {
                stateBeforeCdata5(this, c);
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            } else if (this._state === State.BeforeCdata6) {
                this.stateBeforeCdata6(c);
            } else {
                this.cbs.onerror(Error("unknown _state"), this._state);
            }
            this._index++;
        }
        this.cleanup();
    }

    private finish() {
        // If there is remaining data, emit it in a reasonable way
        if (this.sectionStart < this._index) {
            this.handleTrailingData();
        }
        this.cbs.onend();
    }

    private handleTrailingData() {
        const data = this.buffer.substr(this.sectionStart);
        if (
            this._state === State.InCdata ||
            this._state === State.AfterCdata1 ||
            this._state === State.AfterCdata2
        ) {
            this.cbs.oncdata(data);
        } else if (
            this._state === State.InComment ||
            this._state === State.AfterComment1 ||
            this._state === State.AfterComment2
        ) {
            this.cbs.oncomment(data);
        } else if (!this.xmlMode && this._state === State.InEntity) {
            this.emitEntity();
            // If there are any characters left in the buffer, emit them
            if (this.sectionStart < this._index) {
                this.emitPartial(this.buffer.substr(this.sectionStart));
            }
        } else if (
            this._state !== State.InTagName &&
            this._state !== State.BeforeAttributeName &&
            this._state !== State.BeforeAttributeValue &&
            this._state !== State.AfterAttributeName &&
            this._state !== State.InAttributeName &&
            this._state !== State.InAttributeValueSq &&
            this._state !== State.InAttributeValueDq &&
            this._state !== State.InAttributeValueNq &&
            this._state !== State.InClosingTagName
        ) {
            this.cbs.ontext(data);
        }
        /*
         * Else, ignore remaining data
         * TODO add a way to remove current tag
         */
    }

    private getSection(): string {
        return this.buffer.substring(this.sectionStart, this._index);
    }

    private emitPartial(value: string) {
        if (this.baseState !== State.Text) {
            this.cbs.onattribdata(value);
        } else {
            this.cbs.ontext(value);
        }
    }
}
