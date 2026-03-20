import { describe, expect, it } from "vitest";
import { Tokenizer } from "./index.js";
import type { Callbacks } from "./Tokenizer.js";

function tokenize(
    data: string | ((tokenizer: Tokenizer, log: unknown[][]) => void),
    options = {},
) {
    const log: unknown[][] = [];
    const tokenizer = new Tokenizer(
        options,
        new Proxy(
            { isInForeignContext: () => false },
            {
                get(target, property) {
                    if (property === "isInForeignContext") {
                        return target.isInForeignContext;
                    }
                    return (...values: unknown[]) =>
                        log.push([property, ...values]);
                },
            },
        ) as Callbacks,
    );

    if (typeof data === "function") {
        data(tokenizer, log);
    } else {
        tokenizer.write(data);
        tokenizer.end();
    }

    return log;
}

describe("Tokenizer", () => {
    describe("should ignore self-closing slash in text-only HTML tags", () => {
        it("for self-closing script tag", () => {
            expect(tokenize("<script /><div></div>")).toMatchSnapshot();
        });
        it("for self-closing style tag", () => {
            expect(tokenize("<style /><div></div>")).toMatchSnapshot();
        });
        it("for self-closing title tag", () => {
            expect(tokenize("<title /><div></div>")).toMatchSnapshot();
        });
        it("for self-closing textarea tag", () => {
            expect(tokenize("<textarea /><div></div>")).toMatchSnapshot();
        });
        it("for self-closing xmp tag", () => {
            expect(tokenize("<xmp /><div></div>")).toMatchSnapshot();
        });
        it("for self-closing plaintext tag", () => {
            expect(tokenize("<plaintext /><div></div>")).toMatchSnapshot();
        });
        it("for self-closing iframe tag", () => {
            expect(tokenize("<iframe /><div></div>")).toMatchSnapshot();
        });
        it("for self-closing noembed tag", () => {
            expect(tokenize("<noembed /><div></div>")).toMatchSnapshot();
        });
        it("for self-closing noframes tag", () => {
            expect(tokenize("<noframes /><div></div>")).toMatchSnapshot();
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
        it("for normal textarea tag", () => {
            expect(
                tokenize("<textarea></textarea><div></div>"),
            ).toMatchSnapshot();
        });
        it("for normal xmp tag", () => {
            expect(tokenize("<xmp></xmp><div></div>")).toMatchSnapshot();
        });
    });

    describe("should treat html inside special tags as text", () => {
        it("for div inside script tag", () => {
            expect(tokenize("<script><div></div></script>")).toMatchSnapshot();
        });
        it("for div inside style tag", () => {
            expect(tokenize("<style><div></div></style>")).toMatchSnapshot();
        });
        it("for div inside title tag", () => {
            expect(tokenize("<title><div></div></title>")).toMatchSnapshot();
        });
        it("for div inside textarea tag", () => {
            expect(
                tokenize("<textarea><div></div></textarea>"),
            ).toMatchSnapshot();
        });
        it("for div inside xmp tag", () => {
            expect(tokenize("<xmp><div></div></xmp>")).toMatchSnapshot();
        });
    });

    describe("should treat html inside raw-text tags as text", () => {
        it("for div inside iframe tag", () => {
            expect(
                tokenize("<iframe>&amp;<div></div></iframe>"),
            ).toMatchSnapshot();
        });
        it("for div inside noembed tag", () => {
            expect(
                tokenize("<noembed>&amp;<div></div></noembed>"),
            ).toMatchSnapshot();
        });
        it("for div inside noframes tag", () => {
            expect(
                tokenize("<noframes>&amp;<div></div></noframes>"),
            ).toMatchSnapshot();
        });
    });

    describe("should close special tags on end tags ending with />", () => {
        it("for script tag", () => {
            expect(tokenize("<script>safe</script/><img>")).toMatchSnapshot();
        });
        it("for style tag", () => {
            expect(tokenize("<style>safe</style/><img>")).toMatchSnapshot();
        });
        it("for title tag", () => {
            expect(tokenize("<title>safe</title/><img>")).toMatchSnapshot();
        });
        it("for textarea tag", () => {
            expect(
                tokenize("<textarea>safe</textarea/><img>"),
            ).toMatchSnapshot();
        });
    });

    describe("should correctly mark attributes", () => {
        it("for no value attribute", () => {
            expect(tokenize("<div aaaaaaa >")).toMatchSnapshot();
        });
        it("for no quotes attribute", () => {
            expect(tokenize("<div aaa=aaa >")).toMatchSnapshot();
        });
        it("for single quotes attribute", () => {
            expect(tokenize("<div aaa='a' >")).toMatchSnapshot();
        });
        it("for double quotes attribute", () => {
            expect(tokenize('<div aaa="a" >')).toMatchSnapshot();
        });
    });

    describe("should not break after special tag followed by an entity", () => {
        it("for normal special tag", () => {
            expect(tokenize("<style>a{}</style>&apos;<br/>")).toMatchSnapshot();
        });
        it("for self-closing special tag", () => {
            expect(tokenize("<style />&apos;<br/>")).toMatchSnapshot();
        });
        it("for recognized self-closing special tag", () => {
            expect(
                tokenize("<style />&apos;<br/>", {
                    recognizeSelfClosing: true,
                }),
            ).toMatchSnapshot();
        });
    });

    describe("should handle entities", () => {
        it("for XML entities", () =>
            expect(
                tokenize("&amp;&gt;&amp&lt;&uuml;&#x61;&#x62&#99;&#100&#101", {
                    xmlMode: true,
                }),
            ).toMatchSnapshot());

        it("for entities in attributes (#276)", () =>
            expect(
                tokenize(
                    '<img src="?&image_uri=1&&image;=2&image=3"/>?&image_uri=1&&image;=2&image=3',
                ),
            ).toMatchSnapshot());

        it("for trailing legacy entity", () =>
            expect(tokenize("&timesbar;&timesbar")).toMatchSnapshot());

        it("for multi-byte entities", () =>
            expect(tokenize("&NotGreaterFullEqual;")).toMatchSnapshot());
    });

    it("should close comments on --!>", () => {
        expect(
            tokenize("<!-- --!><img src=x onerror=alert(1)>-->"),
        ).toMatchSnapshot();
    });

    it("should handle abruptly closed comments", () => {
        expect(tokenize("<!--->text")).toMatchSnapshot();
    });

    it.each(["<!>", "<!->"])("should treat %s as a bogus comment", (input) => {
        expect(tokenize(input)).toMatchSnapshot();
    });

    it.each([
        "<!--",
        "<!---",
        "<!----",
        "<!--a-",
        "<!--a--",
        "<!--a--!",
    ])("should trim unfinished HTML comment closes at EOF for %s", (input) => {
        expect(tokenize(input)).toMatchSnapshot();
    });

    it("should treat <? and <! as bogus comments in HTML", () => {
        expect(tokenize("<?foo><!foo>")).toMatchSnapshot();
    });

    it("should ignore empty closing tags", () => {
        expect(tokenize("</>")).toMatchSnapshot();
    });

    it("should treat <!DOCTYPEhtml> as a declaration", () => {
        expect(tokenize("<!DOCTYPEhtml>")).toMatchSnapshot();
    });

    it("should not treat <!-->  as a complete comment in xmlMode", () => {
        expect(
            tokenize(
                "<root><node>start</node><!--><node>should ignore</node><--><node>end</node></root>",
                { xmlMode: true },
            ),
        ).toMatchSnapshot();
    });

    it.each([
        "script",
        "style",
        "title",
        "textarea",
    ])("should reset after an unclosed %s tag", (tag) => {
        expect(
            tokenize((tokenizer, events) => {
                tokenizer.write(`<${tag}>body{color:red}`);
                tokenizer.end();
                events.length = 0;
                tokenizer.reset();
                tokenizer.write("<div>hello</div>");
                tokenizer.end();
            }).map(([event]) => event),
        ).toEqual([
            "onopentagname",
            "onopentagend",
            "ontext",
            "onclosetag",
            "onend",
        ]);
    });

    it("should terminate XML processing instructions on ?>", () => {
        expect(
            tokenize("<?target data > injected ?>", { xmlMode: true }),
        ).toMatchSnapshot();
    });

    it("should not lose data when pausing", () => {
        const log: unknown[][] = [];
        const tokenizer = new Tokenizer(
            {},
            new Proxy(
                { isInForeignContext: () => false },
                {
                    get(target, property) {
                        if (property === "isInForeignContext") {
                            return target.isInForeignContext;
                        }
                        return (...values: unknown[]) => {
                            if (property === "ontext") {
                                tokenizer.pause();
                            }
                            log.push([property, ...values]);
                        };
                    },
                },
            ) as Callbacks,
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
