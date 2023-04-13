import { Tokenizer } from "./index.js";
import type { Callbacks } from "./Tokenizer.js";

function tokenize(data: string, options = {}) {
    const log: unknown[][] = [];
    const tokenizer = new Tokenizer(
        options,
        new Proxy(
            {},
            {
                get(_, property) {
                    return (...values: unknown[]) =>
                        log.push([property, ...values]);
                },
            }
        ) as Callbacks
    );

    tokenizer.write(data);
    tokenizer.end();

    return log;
}

describe("Tokenizer", () => {
    describe("should support self-closing special tags", () => {
        it("for self-closing script tag", () => {
            expect(tokenize("<script /><div></div>")).toMatchSnapshot();
        });
        it("for self-closing style tag", () => {
            expect(tokenize("<style /><div></div>")).toMatchSnapshot();
        });
        it("for self-closing title tag", () => {
            expect(tokenize("<title /><div></div>")).toMatchSnapshot();
        });
    });

    describe("should support standard special tags", () => {
        it("for normal script tag", () => {
            expect(tokenize("<script></script><div></div>")).toMatchSnapshot();
        });
        it("for normal style tag", () => {
            expect(tokenize("<style></style><div></div>")).toMatchSnapshot();
        });
        it("for normal sitle tag", () => {
            expect(tokenize("<title></title><div></div>")).toMatchSnapshot();
        });
    });

    describe("should not break after special tag followed by an entity", () => {
        it("for normal special tag", () => {
            expect(tokenize("<style>a{}</style>&apos;<br/>")).toMatchSnapshot();
        });
        it("for self-closing special tag", () => {
            expect(tokenize("<style />&apos;<br/>")).toMatchSnapshot();
        });
    });

    describe("should handle entities", () => {
        it("for XML entities", () =>
            expect(
                tokenize("&amp;&gt;&amp&lt;&uuml;&#x61;&#x62&#99;&#100&#101", {
                    xmlMode: true,
                })
            ).toMatchSnapshot());

        it("for entities in attributes (#276)", () =>
            expect(
                tokenize(
                    '<img src="?&image_uri=1&&image;=2&image=3"/>?&image_uri=1&&image;=2&image=3'
                )
            ).toMatchSnapshot());

        it("for trailing legacy entity", () =>
            expect(tokenize("&timesbar;&timesbar")).toMatchSnapshot());

        it("for multi-byte entities", () =>
            expect(tokenize("&NotGreaterFullEqual;")).toMatchSnapshot());
    });

    it("should not lose data when pausing", () => {
        const log: unknown[][] = [];
        const tokenizer = new Tokenizer(
            {},
            new Proxy(
                {},
                {
                    get(_, property) {
                        return (...values: unknown[]) => {
                            if (property === "ontext") {
                                tokenizer.pause();
                            }
                            log.push([property, ...values]);
                        };
                    },
                }
            ) as Callbacks
        );

        tokenizer.write("&am");
        tokenizer.write("p; it up!");
        tokenizer.resume();
        tokenizer.resume();

        // Tokenizer shouldn't be paused
        expect(tokenizer).toHaveProperty("running", true);

        tokenizer.end();

        expect(log).toMatchSnapshot();
    });
});
