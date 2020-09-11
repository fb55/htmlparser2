import type { Parser, Handler } from "./Parser";

/**
 * Calls a specific handler function for all events that are encountered.
 *
 * @param func — The function to multiplex all events to.
 */
export default class MultiplexHandler implements Handler {
    _func: (event: keyof Handler, ...args: unknown[]) => void;

    constructor(func: (event: keyof Handler, ...args: unknown[]) => void) {
        this._func = func;
    }

    onattribute(
        name: string,
        value: string,
        quote: string | null | undefined
    ): void {
        this._func("onattribute", name, value, quote);
    }
    oncdatastart(): void {
        this._func("oncdatastart");
    }
    oncdataend(): void {
        this._func("oncdataend");
    }
    ontext(text: string): void {
        this._func("ontext", text);
    }
    onprocessinginstruction(name: string, value: string): void {
        this._func("onprocessinginstruction", name, value);
    }
    oncomment(comment: string): void {
        this._func("oncomment", comment);
    }
    oncommentend(): void {
        this._func("oncommentend");
    }
    onclosetag(name: string): void {
        this._func("onclosetag", name);
    }
    onopentag(name: string, attribs: { [key: string]: string }): void {
        this._func("onopentag", name, attribs);
    }
    onopentagname(name: string): void {
        this._func("onopentagname", name);
    }
    onerror(error: Error): void {
        this._func("onerror", error);
    }
    onend(): void {
        this._func("onend");
    }
    onparserinit(parser: Parser): void {
        this._func("onparserinit", parser);
    }
    onreset(): void {
        this._func("onreset");
    }
}
