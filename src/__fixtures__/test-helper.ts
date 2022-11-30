import { Parser, type Handler, type ParserOptions } from "../Parser.js";

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
 * @param callback Function to call with all events.
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

export function getPromiseEventCollector(): [
    handler: Partial<Handler>,
    promise: Promise<Event[]>
] {
    let handler: Partial<Handler> | undefined;
    const promise = new Promise<Event[]>((resolve, reject) => {
        handler = getEventCollector((error, events) => {
            if (error) {
                reject(error);
            } else {
                resolve(events!);
            }
        });
    });

    return [handler!, promise];
}
