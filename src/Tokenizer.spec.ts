import { Tokenizer } from ".";

function tokenize(str: string) {
    const log: unknown[][] = [];
    const tokenizer = new Tokenizer(
        {},
        new Proxy({} as any, {
            get(_, prop) {
                return (...args: unknown[]) => log.push([prop, ...args]);
            },
        })
    );

    tokenizer.write(str);
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

    it("should not lose data when pausing", () => {
        const log: unknown[][] = [];
        const tokenizer = new Tokenizer(
            {},
            new Proxy({} as any, {
                get(_, prop) {
                    return (...args: unknown[]) => {
                        if (prop === "ontext") {
                            tokenizer.pause();
                        }
                        log.push([prop, ...args]);
                    };
                },
            })
        );

        tokenizer.write("&amp; it up!");
        tokenizer.resume();
        tokenizer.resume();
        tokenizer.end();

        expect(log).toMatchSnapshot();
    });
});
