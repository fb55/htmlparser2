/*
 * Copyright (C) 2022 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Parser } from "htmlparser2";
import { Handler } from 'htmlparser2/src/main/ets/esm/Parser';

interface Event {
    $event: string;
    data: unknown[];
    startIndex: number;
    endIndex: number;
}

/**
 * Creates a handler that calls the supplied callback with simplified events on
 * completion.
 *
 * @internal
 * @param callback Function to call with all events.
 */
export function getEventCollector(
    callback: (error: Error | null, data?: ESObject) => void,
): Partial<Handler> {
    const events: Event[] = [];
    let parser: Parser;

    function handle(event: string, data: unknown[]): void {
        switch (event) {
            case "onerror": {
                callback(data[0] as Error);
                break;
            }
            case "onend": {
                callback(null, {
                    $event: event.slice(2),
                    startIndex: parser.startIndex,
                    endIndex: parser.endIndex,
                    data,
                });
                break;
            }
            case "onreset": {
                events.length = 0;
                break;
            }
            case "onparserinit": {
                parser = data[0] as Parser;
                break;
            }

            case "onopentag": {
                callback(null, {
                    $event: event.slice(2),
                    startIndex: parser.startIndex,
                    endIndex: parser.endIndex,
                    data,
                });
                break;
            }

            case "ontext": {
                callback(null, {
                    $event: event.slice(2),
                    startIndex: parser.startIndex,
                    endIndex: parser.endIndex,
                    data: data[0],
                })
                break;
            }

            case "onclosetag": {
                if (data[0] === "script") {
                    console.info("htmlparser2--That's it?!");
                }
                break;
            }
            default: {
                const last = events[events.length - 1];
                if (event === "ontext" && last && last.$event === "text") {
                    (last.data[0] as string) += data[0];
                    last.endIndex = parser.endIndex;
                    break;
                }

                if (event === "onattribute" && data[2] === undefined) {
                    data.pop();
                }

                if (!(parser.startIndex <= parser.endIndex)) {
                    throw new Error(
                        `Invalid start/end index ${parser.startIndex} > ${parser.endIndex}`,
                    );
                }

                events.push({
                    $event: event.slice(2),
                    startIndex: parser.startIndex,
                    endIndex: parser.endIndex,
                    data,
                });
                parser.endIndex;
            }
        }
    }

    return new Proxy(
        {},
        {
            get:
            (_, event: string) =>
            (...data: unknown[]) =>
            handle(event, data),
        },
    );
}
