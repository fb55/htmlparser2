import { Parser, Handler, ParserOptions } from "../Parser";
import fs from "fs";
import path from "path";

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
    for (let i = 0; i < data.length; i++) {
        parser.write(data.charAt(i));
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
    cb: (error: Error | null, events?: Event[]) => void
): Partial<Handler> {
    const events: Event[] = [];
    let parser: Parser;

    function handle(event: string, ...data: unknown[]): void {
        if (event === "onerror") {
            cb(data[0] as Error);
        } else if (event === "onend") {
            cb(null, events);
        } else if (event === "onreset") {
            events.length = 0;
        } else if (event === "onparserinit") {
            parser = data[0] as Parser;
            // Don't collect event
        } else if (
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
                event: event.substr(2),
                startIndex: parser.startIndex,
                endIndex: parser.endIndex,
                data,
            });

            parser.endIndex;
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
function getCallback(file: TestFile, done: (err?: Error | null) => void) {
    let firstResult: unknown | undefined;

    return (err: null | Error, actual?: unknown | unknown[]) => {
        expect(err).toBeNull();

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
    describe(name, readDir);

    function readDir() {
        const dir = path.join(__dirname, name);

        fs.readdirSync(dir)
            .filter((file) => !file.startsWith(".") && !file.startsWith("_"))
            .map((name) => path.join(dir, name))
            .map(require)
            .forEach(runTest);
    }

    function runTest(file: TestFile) {
        test(file.name, (done) => getResult(file, getCallback(file, done)));
    }
}
