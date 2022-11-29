import { Parser, Handler, ParserOptions } from "../Parser.js";
import fs from "node:fs";
import path from "node:path";

/**
 * Write to the parser twice, once a bytes, once as
 * a single blob.
 *
 * @internal
 * @param handler Handler to execute.
 * @param options Parsing options.
 * @param data Data to write.
 */
export function writeToParser(
    handler: Partial<Handler>,
    options: ParserOptions | undefined,
    data: string
): void {
    const parser = new Parser(handler, options);
    // First, try to run the test via chunks
    for (let index = 0; index < data.length; index++) {
        parser.write(data.charAt(index));
    }
    parser.end();
    // Then, parse everything
    parser.parseComplete(data);
}

interface Event {
    event: string;
    data: unknown[];
    startIndex?: number;
    endIndex?: number;
}

/**
 * Creates a handler that calls the supplied callback with simplified events on
 * completion.
 *
 * @internal
 * @param cb Function to call with all events.
 */
export function getEventCollector(
    callback: (error: Error | null, events?: Event[]) => void
): Partial<Handler> {
    const events: Event[] = [];
    let parser: Parser;

    function handle(event: string, ...data: unknown[]): void {
        switch (event) {
            case "onerror": {
                callback(data[0] as Error);

                break;
            }
            case "onend": {
                callback(null, events);

                break;
            }
            case "onreset": {
                events.length = 0;

                break;
            }
            case "onparserinit": {
                parser = data[0] as Parser;
                // Don't collect event

                break;
            }
            default: {
                if (
                    event === "ontext" &&
                    events[events.length - 1]?.event === "text"
                ) {
                    const last = events[events.length - 1];
                    // Combine text nodes
                    (last.data[0] as string) += data[0];
                    last.endIndex = parser.endIndex;
                } else {
                    // Remove `undefined`s from attribute responses, as they cannot be represented in JSON.
                    if (event === "onattribute" && data[2] === undefined) {
                        data.pop();
                    }

                    if (!(parser.startIndex <= parser.endIndex)) {
                        throw new Error(
                            `Invalid start/end index ${parser.startIndex} > ${parser.endIndex}`
                        );
                    }

                    events.push({
                        event: event.slice(2),
                        startIndex: parser.startIndex,
                        endIndex: parser.endIndex,
                        data,
                    });

                    parser.endIndex;
                }
            }
        }
    }

    return new Proxy(
        {},
        { get: (_, event) => handle.bind(null, event as string) }
    );
}

/**
 * Runs a test suite twice, ensuring input data matches expectations.
 *
 * @param file Test file to execute.
 * @param done Function to call on completion.
 */
function getCallback(file: TestFile, done: (error?: Error | null) => void) {
    let firstResult: unknown | undefined;

    return (error: null | Error, actual?: unknown | unknown[]) => {
        expect(error).toBeNull();

        if (firstResult) {
            expect(actual).toStrictEqual(firstResult);
            done();
        } else {
            if (file.useSnapshot) {
                expect(actual).toMatchSnapshot();
            } else {
                expect(actual).toStrictEqual(file.expected);
            }

            firstResult = actual;
        }
    };
}

interface TestFile {
    name: string;
    options?: {
        parser?: ParserOptions;
    } & Partial<ParserOptions>;
    input: string;
    file: string;
    useSnapshot?: boolean;
    expected?: unknown | unknown[];
}

/**
 * Creates a test suite for a particular directory, with
 * a specified test function.
 *
 * @internal
 * @param name Name of the test directory.
 * @param getResult Function to be called with the actual results.
 */
export function createSuite(
    name: "Events" | "Feeds" | "Stream",
    getResult: (
        file: TestFile,
        done: (error: Error | null, actual?: unknown | unknown[]) => void
    ) => void
): void {
    describe(name, () => {
        const directory = path.join(__dirname, name);

        for (const name of fs.readdirSync(directory)) {
            if (name.startsWith(".") || name.startsWith("_")) {
                continue;
            }

            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const test: TestFile = require(path.join(directory, name));

            it(test.name, (done) => getResult(test, getCallback(test, done)));
        }
    });
}
