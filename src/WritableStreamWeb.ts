import { type Handler, Parser, type ParserOptions } from "./Parser.js";

/**
 * WebWritableStream makes the `Parser` interface available as a Web Streams API WritableStream.
 *
 * This is useful for piping `fetch()` response bodies directly into the parser.
 * @see Parser
 * @example
 * ```typescript
 * import { WebWritableStream } from "htmlparser2/WebWritableStream";
 *
 * const stream = new WebWritableStream({
 *     onopentag(name, attribs) {
 *         console.log("Opened:", name);
 *     },
 * });
 *
 * const response = await fetch("https://example.com");
 * await response.body.pipeTo(stream);
 * ```
 */
// eslint-disable-next-line n/no-unsupported-features/node-builtins -- Web Streams API; requires a runtime with WritableStream (browsers, Deno, Node ≥18.0)
export class WebWritableStream extends WritableStream<string | Uint8Array> {
    constructor(cbs: Partial<Handler>, options?: ParserOptions) {
        const parser = new Parser(cbs, options);
        const decoder = new TextDecoder();
        const streamOption: TextDecodeOptions = { stream: true };

        super({
            write(chunk) {
                parser.write(
                    typeof chunk === "string"
                        ? chunk
                        : decoder.decode(chunk, streamOption),
                );
            },
            close() {
                // Flush any remaining bytes in the decoder
                const remaining = decoder.decode();
                if (remaining) {
                    parser.write(remaining);
                }
                parser.end();
            },
        });
    }
}
