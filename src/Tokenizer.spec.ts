import { Tokenizer } from ".";

class CallbackLogger {
    log: string[] = [];

    onattribdata(value: string) {
        this.log.push(`onattribdata: '${value}'`);
    }
    onattribend() {
        this.log.push(`onattribend`);
    }
    onattribname(name: string) {
        this.log.push(`onattribname: '${name}'`);
    }
    oncdata(data: string) {
        this.log.push(`oncdata: '${data}'`);
    }
    onclosetag(name: string) {
        this.log.push(`onclosetag: '${name}'`);
    }
    oncomment(data: string) {
        this.log.push(`oncomment: '${data}'`);
    }
    ondeclaration(content: string) {
        this.log.push(`ondeclaration: '${content}'`);
    }
    onend() {
        this.log.push(`onend`);
    }
    onerror(error: Error, state?: unknown) {
        this.log.push(`onerror: '${error}', '${state}'`);
    }
    onopentagend() {
        this.log.push(`onopentagend`);
    }
    onopentagname(name: string) {
        this.log.push(`onopentagname: '${name}'`);
    }
    onprocessinginstruction(instruction: string) {
        this.log.push(`onprocessinginstruction: '${instruction}'`);
    }
    onselfclosingtag() {
        this.log.push(`onselfclosingtag`);
    }
    ontext(value: string) {
        this.log.push(`ontext: '${value}'`);
    }
}

describe("Tokenizer", () => {
    test("should support self-closing special tags", () => {
        const logger = new CallbackLogger();
        const tokenizer = new Tokenizer(
            {
                xmlMode: false,
                decodeEntities: false,
            },
            logger
        );

        const selfClosingScriptInput = "<script /><div></div>";
        const selfClosingScriptOutput = [
            "onopentagname: 'script'",
            "onselfclosingtag",
            "onopentagname: 'div'",
            "onopentagend",
            "onclosetag: 'div'",
            "onend",
        ];

        tokenizer.write(selfClosingScriptInput);
        tokenizer.end();
        expect(logger.log).toEqual(selfClosingScriptOutput);
        tokenizer.reset();
        logger.log = [];

        const selfClosingStyleInput = "<style /><div></div>";
        const selfClosingStyleOutput = [
            "onopentagname: 'style'",
            "onselfclosingtag",
            "onopentagname: 'div'",
            "onopentagend",
            "onclosetag: 'div'",
            "onend",
        ];

        tokenizer.write(selfClosingStyleInput);
        tokenizer.end();
        expect(logger.log).toEqual(selfClosingStyleOutput);
        tokenizer.reset();
        logger.log = [];

        const selfClosingTitleInput = "<title /><div></div>";
        const selfClosingTitleOutput = [
            "onopentagname: 'title'",
            "onselfclosingtag",
            "onopentagname: 'div'",
            "onopentagend",
            "onclosetag: 'div'",
            "onend",
        ];

        tokenizer.write(selfClosingTitleInput);
        tokenizer.end();
        expect(logger.log).toEqual(selfClosingTitleOutput);
        tokenizer.reset();
        logger.log = [];

        const selfClosingTemplateInput = "<template /><div></div>";
        const selfClosingTemplateOutput = [
            "onopentagname: 'template'",
            "onselfclosingtag",
            "onopentagname: 'div'",
            "onopentagend",
            "onclosetag: 'div'",
            "onend",
        ];

        tokenizer.write(selfClosingTemplateInput);
        tokenizer.end();
        expect(logger.log).toEqual(selfClosingTemplateOutput);
        tokenizer.reset();
        logger.log = [];
    });

    test("should support standard special tags", () => {
        const logger = new CallbackLogger();
        const tokenizer = new Tokenizer(
            {
                xmlMode: false,
                decodeEntities: false,
            },
            logger
        );

        const normalScriptInput = "<script><b></b></script><div></div>";
        const normalScriptOutput = [
            "onopentagname: 'script'",
            "onopentagend",
            "ontext: '<b>'",
            "ontext: '</b>'",
            "onclosetag: 'script'",
            "onopentagname: 'div'",
            "onopentagend",
            "onclosetag: 'div'",
            "onend",
        ];

        tokenizer.write(normalScriptInput);
        tokenizer.end();
        expect(logger.log).toEqual(normalScriptOutput);
        tokenizer.reset();
        logger.log = [];

        const normalStyleInput = "<style><b></b></style><div></div>";
        const normalStyleOutput = [
            "onopentagname: 'style'",
            "onopentagend",
            "ontext: '<b>'",
            "ontext: '</b>'",
            "onclosetag: 'style'",
            "onopentagname: 'div'",
            "onopentagend",
            "onclosetag: 'div'",
            "onend",
        ];

        tokenizer.write(normalStyleInput);
        tokenizer.end();
        expect(logger.log).toEqual(normalStyleOutput);
        tokenizer.reset();
        logger.log = [];

        const normalTitleInput = "<title><b></b></title><div></div>";
        const normalTitleOutput = [
            "onopentagname: 'title'",
            "onopentagend",
            "ontext: '<b>'",
            "ontext: '</b>'",
            "onclosetag: 'title'",
            "onopentagname: 'div'",
            "onopentagend",
            "onclosetag: 'div'",
            "onend",
        ];

        tokenizer.write(normalTitleInput);
        tokenizer.end();
        expect(logger.log).toEqual(normalTitleOutput);
        tokenizer.reset();
        logger.log = [];

        const normalTemplateInput = "<template><b></b></template><div></div>";
        const normalTemplateOutput = [
            "onopentagname: 'template'",
            "onopentagend",
            "ontext: '<b>'",
            "ontext: '</b>'",
            "onclosetag: 'template'",
            "onopentagname: 'div'",
            "onopentagend",
            "onclosetag: 'div'",
            "onend",
        ];

        tokenizer.write(normalTemplateInput);
        tokenizer.end();
        expect(logger.log).toEqual(normalTemplateOutput);
        tokenizer.reset();
        logger.log = [];
    });
});
