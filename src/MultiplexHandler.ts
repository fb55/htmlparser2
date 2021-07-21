import type { Parser, Handler } from "./Parser";
import { ErbBeginBlock, ErbEndBlock, FileLocation } from "./Tokenizer";

/**
 * Calls a specific handler function for all events that are encountered.
 */
export default class MultiplexHandler implements Handler {
    /**
     * @param func The function to multiplex all events to.
     */
    constructor(
        private readonly func: (
            event: keyof Handler,
            ...args: unknown[]
        ) => void
    ) {}

    onattribute(
        name: string,
        value: string,
        where: FileLocation,
        quote: string | null | undefined
    ): void {
        this.func("onattribute", name, value, where, quote);
    }
    oncdatastart(): void {
        this.func("oncdatastart");
    }
    oncdataend(where: FileLocation): void {
        this.func("oncdataend", where);
    }
    ontext(text: string, where: FileLocation): void {
        this.func("ontext", text, where);
    }
    onprocessinginstruction(
        name: string,
        value: string,
        where: FileLocation
    ): void {
        this.func("onprocessinginstruction", name, value, where);
    }
    oncomment(comment: string, where: FileLocation): void {
        this.func("oncomment", comment, where);
    }
    oncommentend(where: FileLocation): void {
        this.func("oncommentend", where);
    }
    onclosetag(name: string, where: FileLocation): void {
        this.func("onclosetag", name, where);
    }
    onopentag(
        name: string,
        attribs: { [key: string]: string },
        where: FileLocation
    ): void {
        this.func("onopentag", name, attribs, where);
    }
    onopentagname(name: string, where: FileLocation): void {
        this.func("onopentagname", name, where);
    }
    onerbexpression(data: string, where: FileLocation): void {
        this.func("onerbexpression", data, where);
    }
    onerbscriptlet(data: string, where: FileLocation): void {
        this.func("onerbscriptlet", data, where);
    }
    onerbbeginblock(beginBlock: ErbBeginBlock, where: FileLocation): void {
        this.func("onerbbeginblock", beginBlock, where);
    }
    onerbendblock(endBlock: ErbEndBlock, where: FileLocation): void {
        this.func("onerbendblock", endBlock, where);
    }
    onerror(error: Error, where: FileLocation): void {
        this.func("onerror", error, where);
    }
    onend(): void {
        this.func("onend");
    }
    onparserinit(parser: Parser): void {
        this.func("onparserinit", parser);
    }
    onreset(): void {
        this.func("onreset");
    }
}
