import { describe, expect, it } from "vitest";
import Tokenizer from "./Tokenizer.js";

/*
 * Differential test for `Tokenizer.fastForwardTo`.
 *
 * `fastForwardTo` can be written as a `charCodeAt` loop or as a single
 * `String.indexOf`. The two are only interchangeable if they are
 * indistinguishable on (return value, resulting `index`, exception) for every
 * reachable argument, which is what this file asserts over a case space real
 * markup never reaches: start positions outside the buffer, the empty buffer,
 * non-zero `offset`, astral-plane content, and non-ASCII sentinels.
 *
 * The loop is transcribed here as the oracle and the shipped method is
 * compared against it, so this file passes whichever implementation ships.
 * The mutants at the bottom are what prove it can fail: each is a plausible
 * way to get the `indexOf` form wrong, and each must be caught here.
 */

/** The three fields `fastForwardTo` reads and writes. Nothing else is touched. */
interface SkipState {
    buffer: string;
    index: number;
    offset: number;
}

type SkipFunction = (this: SkipState, c: number) => boolean;

/**
 * Upstream's loop, transcribed verbatim from htmlparser2 10.1.0. Frozen here
 * as the oracle: it defines the contract, so it must not be "cleaned up".
 * @param c
 */
const loop: SkipFunction = function loop(this: SkipState, c: number): boolean {
    while (++this.index < this.buffer.length + this.offset) {
        if (this.buffer.charCodeAt(this.index - this.offset) === c) {
            return true;
        }
    }

    this.index = this.buffer.length + this.offset - 1;

    return false;
};

/**
 * The method this package actually ships, reached through the prototype with a
 * duck-typed `this`. Going through the prototype rather than copying the body
 * is the whole point: a copy would prove nothing about what gets published.
 */
const shipped: SkipFunction = (
    Tokenizer.prototype as unknown as { fastForwardTo: SkipFunction }
).fastForwardTo;

/**
 * A correct patch, kept next to the oracle so the mutants below are checked
 * against something that must pass. This is the shape `Tokenizer.fastForwardTo`
 * takes once the fork's patch lands; it is deliberately not imported from
 * there, so the harness still has a known-good reference before that happens.
 */
const REFERENCE_NEEDLES = Array.from({ length: 128 }, (_, code) =>
    String.fromCharCode(code),
);

const correctPatch: SkipFunction = function reference(
    this: SkipState,
    c: number,
): boolean {
    const needle = c < 128 ? REFERENCE_NEEDLES[c] : String.fromCharCode(c);
    const found = this.buffer.indexOf(needle, this.index - this.offset + 1);

    if (found !== -1) {
        this.index = found + this.offset;
        return true;
    }

    this.index = this.buffer.length + this.offset - 1;
    return false;
};

interface Outcome {
    returned: boolean | null;
    index: number;
    thrown: string | null;
}

function run(function_: SkipFunction, state: SkipState, c: number): Outcome {
    const scratch: SkipState = { ...state };

    try {
        return {
            returned: function_.call(scratch, c),
            index: scratch.index,
            thrown: null,
        };
    } catch (error) {
        return { returned: null, index: scratch.index, thrown: String(error) };
    }
}

/**
 * Assert a candidate is indistinguishable from the oracle for one case.
 * @param candidate
 * @param state
 * @param c
 */
function expectAgreement(
    candidate: SkipFunction,
    state: SkipState,
    c: number,
): void {
    const context = {
        buffer: state.buffer,
        index: state.index,
        offset: state.offset,
        sentinel: c,
    };

    expect({ ...context, ...run(candidate, state, c) }).toEqual({
        ...context,
        ...run(loop, state, c),
    });
}

/** Every sentinel `fastForwardTo` can be called with, from its 8 call sites. */
const REACHABLE_SENTINELS = [
    0x22, // `"` - handleInAttributeValue
    0x27, // `'` - handleInAttributeValue
    0x2d, // `-` - stateInCommentLike, CommentEnd
    0x3c, // `<` - stateText, stateInSpecialTag
    0x3e, // `>` - stateAfterClosingTagName, stateInDeclaration, stateInSpecialComment
    0x3f, // `?` - stateInProcessingInstruction
    0x5d, // `]` - stateInCommentLike, CdataEnd
];

/**
 * Deterministic PRNG, so a failing random case is reproducible from its seed.
 * @param seed
 */
function seededRandom(seed: number): () => number {
    let state = seed >>> 0;

    return function next(): number {
        state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
        return state / 4_294_967_296;
    };
}

/*
 * Plausible ways to get the `indexOf` form wrong, used by the harness
 * self-tests below.
 */
/**
 * Drops the `- 1` that compensates for the `parse` loop's increment.
 * @param c
 */
const missingFailureAdjustment: SkipFunction = function mutant(
    this: SkipState,
    c: number,
): boolean {
    const found = this.buffer.indexOf(
        REFERENCE_NEEDLES[c],
        this.index - this.offset + 1,
    );

    if (found !== -1) {
        this.index = found + this.offset;
        return true;
    }

    this.index = this.buffer.length + this.offset;
    return false;
};

/**
 * The needle table without the domain guard above code 127.
 * @param c
 */
const unguardedNeedleTable: SkipFunction = function mutant(
    this: SkipState,
    c: number,
): boolean {
    const found = this.buffer.indexOf(
        REFERENCE_NEEDLES[c],
        this.index - this.offset + 1,
    );

    if (found !== -1) {
        this.index = found + this.offset;
        return true;
    }

    this.index = this.buffer.length + this.offset - 1;
    return false;
};

/**
 * Starts the scan at `index` instead of `index + 1`.
 * @param c
 */
const reexaminesCurrentCharacter: SkipFunction = function mutant(
    this: SkipState,
    c: number,
): boolean {
    const found = this.buffer.indexOf(
        REFERENCE_NEEDLES[c],
        this.index - this.offset,
    );

    if (found !== -1) {
        this.index = found + this.offset;
        return true;
    }

    this.index = this.buffer.length + this.offset - 1;
    return false;
};

describe("fastForwardTo differential", () => {
    /*
     * Exhaustive over every 3-symbol string on an alphabet that mixes an
     * ordinary letter, two real sentinels, a Latin-1 character and an astral
     * one. The astral symbol is two UTF-16 code units, so buffer lengths vary
     * and surrogate halves land next to the sentinels - the case a
     * single-code-unit needle could in principle match.
     */
    it("agrees on every short string, offset and start position", () => {
        const alphabet = ["a", "<", '"', "é", "\u{1F600}"];
        const sentinels = [0x3c, 0x22, 0x3e, 0xe9];
        let cases = 0;

        for (const first of alphabet) {
            for (const second of alphabet) {
                for (const third of alphabet) {
                    const buffer = first + second + third;

                    for (const offset of [0, 5, 1000]) {
                        // From two before the buffer to one past its end.
                        for (
                            let index = offset - 2;
                            index <= offset + buffer.length + 1;
                            index++
                        ) {
                            for (const sentinel of sentinels) {
                                expectAgreement(
                                    shipped,
                                    { buffer, index, offset },
                                    sentinel,
                                );
                                cases++;
                            }
                        }
                    }
                }
            }
        }

        expect(cases).toBeGreaterThan(10_000);
    });

    it("agrees on the empty buffer", () => {
        for (const offset of [0, 5, 1000]) {
            for (const index of [offset - 1, offset, offset + 1]) {
                for (const sentinel of REACHABLE_SENTINELS) {
                    expectAgreement(
                        shipped,
                        { buffer: "", index, offset },
                        sentinel,
                    );
                }
            }
        }
    });

    it("agrees when the sentinel is absent, first, or last", () => {
        const filler = "abcdefghij";

        for (const offset of [0, 7]) {
            expectAgreement(
                shipped,
                { buffer: filler, index: offset, offset },
                0x3c,
            );
            expectAgreement(
                shipped,
                { buffer: `a<${filler}`, index: offset, offset },
                0x3c,
            );
            expectAgreement(
                shipped,
                { buffer: `${filler}<`, index: offset, offset },
                0x3c,
            );
        }
    });

    it("agrees when the sentinel is the very next character", () => {
        /*
         * The caller has already examined the character at `index`, so the scan
         * must start one further along. A candidate that re-examines `index`
         * would return a position the caller already rejected.
         */
        expectAgreement(shipped, { buffer: "<a<b", index: 0, offset: 0 }, 0x3c);
        expectAgreement(shipped, { buffer: "<<ab", index: 0, offset: 0 }, 0x3c);
    });

    it("returns an absolute index, not a buffer-relative one", () => {
        /*
         * Sentinel late in a chunk that starts 100_000 characters into the
         * document: a candidate that forgot to add `offset` back would return
         * a small number and every downstream index would shift.
         */
        expectAgreement(
            shipped,
            { buffer: `${"x".repeat(500)}<`, index: 100_000, offset: 100_000 },
            0x3c,
        );
    });

    it("agrees on 3000 random buffers for every reachable sentinel", () => {
        const random = seededRandom(0x5f_37_59_df);
        const symbols = [
            "a",
            "b",
            " ",
            "<",
            ">",
            '"',
            "'",
            "-",
            "?",
            "]",
            "é",
            "\u{1F600}",
        ];

        for (let n = 0; n < 3000; n++) {
            const length = Math.floor(random() * 200);
            let buffer = "";

            for (let index_ = 0; index_ < length; index_++) {
                buffer += symbols[Math.floor(random() * symbols.length)];
            }

            const offset = Math.floor(random() * 3) * 500;
            const index =
                offset + Math.floor(random() * (buffer.length + 3)) - 1;

            for (const sentinel of REACHABLE_SENTINELS) {
                expectAgreement(shipped, { buffer, index, offset }, sentinel);
            }
        }
    });

    it("agrees on a non-ASCII sentinel next to the literal word `undefined`", () => {
        /*
         * The regression the domain guard exists for. A needle table covering
         * only 0-127 yields `undefined` above that, and `indexOf(undefined)`
         * stringifies its argument and searches for the literal word - a wrong
         * position, silently, with no exception to notice.
         */
        expectAgreement(
            shipped,
            { buffer: "abcundefinedéx", index: 0, offset: 0 },
            0xe9,
        );
    });
});

/*
 * Harness self-tests. When the loop is what ships, every comparison above is
 * the oracle against itself and proves nothing; these are what keep the file
 * honest either way. Each mutant must be caught, and a correct patch must not.
 */
describe("fastForwardTo differential harness", () => {
    it("catches a missing failure-path adjustment", () => {
        expect(() =>
            expectAgreement(
                missingFailureAdjustment,
                { buffer: "abc", index: 0, offset: 0 },
                0x3c,
            ),
        ).toThrow();
    });

    it("catches an unguarded needle table on a non-ASCII sentinel", () => {
        expect(() =>
            expectAgreement(
                unguardedNeedleTable,
                { buffer: "abcundefinedéx", index: 0, offset: 0 },
                0xe9,
            ),
        ).toThrow();
    });

    it("catches a scan that re-examines the current character", () => {
        expect(() =>
            expectAgreement(
                reexaminesCurrentCharacter,
                { buffer: "<abc", index: 0, offset: 0 },
                0x3c,
            ),
        ).toThrow();
    });

    it("passes a correct patch, so the mutants above are not caught by accident", () => {
        for (const buffer of ["abc", "", "abcundefinedéx", "a<b", "<<"]) {
            for (const offset of [0, 5]) {
                for (
                    let index = offset - 1;
                    index <= offset + buffer.length;
                    index++
                ) {
                    for (const sentinel of [...REACHABLE_SENTINELS, 0xe9]) {
                        expectAgreement(
                            correctPatch,
                            { buffer, index, offset },
                            sentinel,
                        );
                    }
                }
            }
        }
    });
});

/**
 * Run the real tokenizer and log every callback it fires. `chunkSize` of 0
 * writes the document in one go; anything else splits the writes, which is the
 * only input dimension that makes `fastForwardTo` cross a chunk boundary.
 * @param data
 * @param decodeEntities
 * @param chunkSize
 */
function tokenize(
    data: string,
    decodeEntities: boolean,
    chunkSize = 0,
): unknown[][] {
    const log: unknown[][] = [];
    const tokenizer = new Tokenizer(
        { decodeEntities },
        new Proxy(
            {},
            {
                get(_, property) {
                    return (...values: unknown[]) =>
                        log.push([property, ...values]);
                },
            },
        ) as ConstructorParameters<typeof Tokenizer>[1],
    );

    if (chunkSize > 0) {
        for (let at = 0; at < data.length; at += chunkSize) {
            tokenizer.write(data.slice(at, at + chunkSize));
        }
    } else {
        tokenizer.write(data);
    }

    tokenizer.end();

    return log;
}

/**
 * Run `body` with `implementation` swapped onto the prototype, then restore.
 * @param implementation
 * @param body
 */
function withSkip<T>(implementation: SkipFunction, body: () => T): T {
    const prototype = Tokenizer.prototype as unknown as {
        fastForwardTo: SkipFunction;
    };
    const shippedImplementation = prototype.fastForwardTo;

    prototype.fastForwardTo = implementation;

    try {
        return body();
    } finally {
        prototype.fastForwardTo = shippedImplementation;
    }
}

/**
 * Assert the shipped tokenizer and the loop-backed one emit the same events.
 * @param data
 * @param chunkSize
 */
function expectSameStream(data: string, chunkSize = 0): void {
    for (const decodeEntities of [false, true]) {
        expect(tokenize(data, decodeEntities, chunkSize)).toEqual(
            withSkip(loop, () => tokenize(data, decodeEntities, chunkSize)),
        );
    }
}

/*
 * Stream-level equivalence. The differential block above proves the function
 * agrees with the loop; this proves the tokenizer built on it emits the same
 * events, on the markup shapes where the fast skip actually does the work.
 *
 * Both sides run the real tokenizer: the reference run swaps the loop back
 * onto the prototype for its duration, so the two streams differ in nothing
 * but this one method.
 */
describe("fastForwardTo stream equivalence", () => {
    it("emits one text event for a long style body with no `<`", () => {
        const body = "a{color:red}".repeat(8000);
        const document = `<style>${body}</style>`;

        expectSameStream(document);

        // The point of the patch: ~96 KB crossed, not one dispatch per byte.
        const text = tokenize(document, false).filter(
            ([event]) => event === "ontext",
        );
        expect(text).toHaveLength(1);
    });

    it("does not mistake `<` inside a script string literal for markup", () => {
        expectSameStream(
            '<script>var a = "<b>"; if (a < 3 && b </ 4) {}</script><p>after</p>',
        );
    });

    it("handles `<` inside a style declaration value", () => {
        expectSameStream('<style>a::after{content:"<"}</style><p>after</p>');
    });

    it("emits the same trailing comment for an unterminated comment", () => {
        expectSameStream("<p>text</p><!-- never closed");
    });

    it("handles CDATA and processing instructions", () => {
        expectSameStream(
            '<![CDATA[ raw < content ]]><?xml version="1.0"?><p>x</p>',
        );
    });

    it("handles every attribute quoting style on one tag", () => {
        expectSameStream(
            "<input disabled name=plain id='single' class=\"double\" data-x=''>",
        );
    });

    it("handles whitespace before the closing bracket of an end tag", () => {
        expectSameStream("<script>x</script >after");
    });

    it("handles text with no `<` at all", () => {
        expectSameStream("just some text and nothing else");
    });

    it("handles input that ends before its sentinel arrives", () => {
        // The failure path, which is where the off-by-one lives.
        expectSameStream("<p>hello world");
        expectSameStream("<script>var a = 1;");
        expectSameStream('<p class="never closed');
        expectSameStream("<!DOCTYPE html");
        expectSameStream("<style>a{b:c}</style>trailing");
    });

    it("agrees at every write-chunk split", () => {
        /*
         * `fastForwardTo` is the only place the `index`/`offset` arithmetic
         * crosses a chunk boundary, so splitting the writes is the one input
         * dimension that can desynchronise the two implementations.
         */
        const document_ =
            '<div id="a"><style>x{y:z}</style><script>if (a < 3) {}</script>' +
            "<!-- c --><p>text</p>trailing";

        for (const size of [1, 2, 7, 64, 1000]) {
            expectSameStream(document_, size);
        }
    });

    it("handles the empty document and a lone `<`", () => {
        expectSameStream("");
        expectSameStream("<");
    });

    it("detects a broken skip, so the comparisons above are not vacuous", () => {
        /*
         * Swap in the dropped-`- 1` mutant and confirm the stream moves. If
         * this passes trivially, the prototype swap is not taking effect and
         * every comparison in this block is comparing a run to itself.
         *
         * The document must end without the sentinel it is looking for: the
         * `- 1` only matters on the failure path, so a document whose every
         * skip succeeds cannot tell the two apart.
         */
        const document_ = "<style>a{color:red}</style>trailing text";
        const reference = tokenize(document_, false);

        expect(
            withSkip(missingFailureAdjustment, () =>
                tokenize(document_, false),
            ),
        ).not.toEqual(reference);
    });
});
