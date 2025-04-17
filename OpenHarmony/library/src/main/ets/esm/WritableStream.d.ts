/// <reference types="node" />
/// <reference types="node" />
import { Handler, ParserOptions } from "./Parser.js";
import { Writable,buffer } from "@ohos/node-polyfill";

/**
 * WritableStream makes the `Parser` interface available as a NodeJS stream.
 *
 * @see Parser
 */
export declare class WritableStream extends Writable {
    private readonly _parser;
    private readonly _decoder;
    constructor(cbs: Partial<Handler>, options?: ParserOptions);
    _write(chunk: string | buffer.Buffer, encoding: string, callback: () => void): void;
    _final(callback: () => void): void;
}
//# sourceMappingURL=WritableStream.d.ts.map