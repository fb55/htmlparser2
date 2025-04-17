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

import { describe, it, expect } from '@ohos/hypium';
import {
    Parser,
    parseDocument,
    DomUtils,
    Document,
    createDocumentStream,
    parseFeed,
    Feed,
    Tokenizer
} from 'htmlparser2'
import * as helper from "./test-helper";
import { Callbacks, QuoteType } from "htmlparser2/src/main/ets/esm/Tokenizer";

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<style>
    .tagh1{
        background-color: aquamarine;
        color:'blue';
    }
    .one-div{
        line-height: 30px;
    }
</style>
<body>
    <h1 class="tagh1">
        kkkk
        <p>hhhhh</p>
    </h1>
    <div style="color:red; height:100px;" class="one-div">cshi</div>
    <img src="https:baidu.com" alt="wwww"/>
    <p>wjdwekfe</p>
    <em>dsjfw
    <div>dksfmjk</div>
    owqkdo</em>
</body>
</html>
`

const rssFeed = `<?xml version="1.0"?>
<!-- http://cyber.law.harvard.edu/rss/examples/rss2sample.xml -->
<rss version="2.0">
   <channel>
      <title>Liftoff News</title>
      <link>http://liftoff.msfc.nasa.gov/</link>
      <description>Liftoff to Space Exploration.</description>
      <language>en-us</language>
      <pubDate>Tue, 10 Jun 2003 04:00:00 GMT</pubDate>

      <lastBuildDate>Tue, 10 Jun 2003 09:41:01 GMT</lastBuildDate>
      <docs>http://blogs.law.harvard.edu/tech/rss</docs>
      <generator>Weblog Editor 2.0</generator>
      <managingEditor>editor@example.com</managingEditor>
      <webMaster>webmaster@example.com</webMaster>
      <item>

         <title>Star City</title>
         <link>http://liftoff.msfc.nasa.gov/news/2003/news-starcity.asp</link>
         <description>How do Americans get ready to work with Russians aboard the International Space Station? They take a crash course in culture, language and protocol at Russia's &lt;a href="http://howe.iki.rssi.ru/GCTC/gctc_e.htm"&gt;Star City&lt;/a&gt;.</description>
         <pubDate>Tue, 03 Jun 2003 09:39:21 GMT</pubDate>
         <guid>http://liftoff.msfc.nasa.gov/2003/06/03.html#item573</guid>

      </item>
   </channel>
</rss>`

export default function abilityTest() {
    describe('ActsAbilityTest', () => {
        it('parser_write_and_end', 0, () => {
            return new Promise<void>((resolve, reject) => {
                let arr: Array<string> = new Array()
                const handler = helper.getEventCollector((error, actual: ESObject) => {
                    if (error) {
                        expect().assertFail()
                        return reject(error);
                    }

                    if (actual.$event == "text") {
                        arr.push(actual.data)
                    }

                    if (actual.$event == "end") {
                        expect(arr).assertDeepEquals(["Xyz ", "const foo = '<<bar>>';"])
                        resolve()
                    }
                });
                const parser = new Parser(handler);
                parser.write("Xyz <script type='text/javascript'>const foo = '<<bar>>';</script>",);
                parser.end();
            });
        })

        it('parser_pause_and_resume', 0, () => {
            return new Promise<void>((resolve, reject) => {
                let arr: Array<string> = new Array()
                let parser: Parser | null = null

                const handler = helper.getEventCollector((error, actual: ESObject) => {
                    if (error) {
                        expect().assertFail()
                        return reject(error);
                    }

                    if (actual.$event == "text") {
                        if (!!parser && arr.length == 0) {
                            parser.pause()
                        }
                        arr.push(actual.data)
                    }

                    if (actual.$event == "end") {
                        expect(arr).assertDeepEquals(["const foo = '<<bar>>';", "const fruit = '<<apple>>';"])
                        resolve()
                    }
                });
                parser = new Parser(handler);
                parser.write("<script type='text/javascript'>const foo = '<<bar>>';</script>",);
                expect(arr).assertDeepEquals(["const foo = '<<bar>>';"])
                parser.write("<script type='text/javascript'>const fruit = '<<apple>>';</script>",);
                expect(arr).assertDeepEquals(["const foo = '<<bar>>';"])
                parser.resume()
                parser.end();
            });
        })

        it('parser_reset', 0, () => {
            return new Promise<void>((resolve, reject) => {
                let arr: Array<string> = new Array()
                let parser: Parser | null = null

                const handler = helper.getEventCollector((error, actual: ESObject) => {
                    if (error) {
                        expect().assertFail()
                        return reject(error);
                    }

                    if (actual.$event == "text") {
                        arr.push(actual.data)
                    }

                    if (actual.$event == "end") {
                        expect(arr).assertDeepEquals(["const foo = '<<bar>>';", "const fruit = '<<apple>>';"])
                        resolve()
                    }
                });
                parser = new Parser(handler);
                parser.write("<script type='text/javascript'>const foo = '<<bar>>';</script>");
                expect(arr).assertDeepEquals(["const foo = '<<bar>>';"])
                parser.reset()
                parser.write("<script type='text/javascript'>const fruit = '<<apple>>';</script>");
                parser.end();
            });
        })

        it('parser_parseComplete', 0, () => {
            return new Promise<void>((resolve, reject) => {
                let arr: Array<string> = new Array()
                let parser: Parser | null = null

                const handler = helper.getEventCollector((error, actual: ESObject) => {
                    if (error) {
                        expect().assertFail()
                        return reject(error);
                    }

                    if (actual.$event == "text") {
                        arr.push(actual.data)
                    }

                    if (actual.$event == "end") {
                        expect(arr).assertDeepEquals(["Xyz ", "const foo = '<<bar>>';"])
                        resolve()
                    }
                });
                parser = new Parser(handler);
                parser.parseComplete("Xyz <script type='text/javascript'>const foo = '<<bar>>';</script>")
            });
        })

        it('parseDocument', 0, () => {
            let dom: Document = parseDocument(html);
            let element = DomUtils.getElementsByTagName('style', dom);
            let text = DomUtils.textContent(element);
            expect("\n    .tagh1{\n        background-color: aquamarine;\n        color:'blue';\n    }\n    .one-div{\n        line-height: 30px;\n    }\n")
                .assertEqual(text)
            let isTag = DomUtils.isTag(element[0]);
            expect(isTag).assertTrue()
            let isCDATA = DomUtils.isCDATA(element[0]);
            expect(isCDATA).assertFalse()
            let isText = DomUtils.isText(element[0]);
            expect(isText).assertFalse()
            let isComment = DomUtils.isComment(element[0]);
            expect(isComment).assertFalse()

            let body = DomUtils.getElementsByTagName('body', dom);
            let children = DomUtils.getChildren(body[0]);
            expect(children.length).assertEqual(11)
        })


        it('createDocumentStream', 0, () => {
            let parser: Parser = createDocumentStream((error: Error | null, dom: Document) => {
                if (!!error) {
                    expect().assertFail()
                    return
                }
                let element = DomUtils.getElementsByTagName('style', dom);
                let text = DomUtils.textContent(element);
                expect("\n    .tagh1{\n        background-color: aquamarine;\n        color:'blue';\n    }\n    .one-div{\n        line-height: 30px;\n    }\n")
                    .assertEqual(text)
                let isTag = DomUtils.isTag(element[0]);
                expect(isTag).assertTrue()
                let isCDATA = DomUtils.isCDATA(element[0]);
                expect(isCDATA).assertFalse()
                let isText = DomUtils.isText(element[0]);
                expect(isText).assertFalse()
                let isComment = DomUtils.isComment(element[0]);
                expect(isComment).assertFalse()

                let body = DomUtils.getElementsByTagName('body', dom);
                let children = DomUtils.getChildren(body[0]);
                expect(children.length).assertEqual(11)
            });
            parser.write(html);
            parser.end();
        })

        it('parseFeed', 0, () => {
            let feed: Feed | null = parseFeed(rssFeed)
            if (!!feed) {
                expect("rss").assertEqual(feed.type)
                expect("Liftoff News").assertEqual(feed.title)
                expect("http://liftoff.msfc.nasa.gov/").assertEqual(feed.link)
                expect("Liftoff to Space Exploration.").assertEqual(feed.description)
                expect("editor@example.com").assertEqual(feed.author)
            } else {
                expect().assertFail()
            }
        })

        it('tokenizer_write_and_end', 0, () => {
            return new Promise<void>((resolve, reject) => {
                let arr: Array<number> = new Array()
                const callbacks: Callbacks = {
                    onattribdata(start: number, endIndex: number) {
                    },
                    onattribentity(codepoint: number) {
                    },
                    onattribend(quote: QuoteType, endIndex: number) {
                    },
                    onattribname(start: number, endIndex: number) {
                    },
                    oncdata(start: number, endIndex: number, endOffset: number) {
                    },
                    onclosetag(start: number, endIndex: number) {
                    },
                    oncomment(start: number, endIndex: number, endOffset: number) {
                    },
                    ondeclaration(start: number, endIndex: number) {
                    },
                    onend() {
                        expect([19, 27, 52, 64]).assertDeepEquals(arr)
                        resolve()
                    },
                    onopentagend(endIndex: number) {
                    },
                    onopentagname(start: number, endIndex: number) {
                    },
                    onprocessinginstruction(start: number, endIndex: number) {
                    },
                    onselfclosingtag(endIndex: number) {
                    },
                    ontext(start: number, endIndex: number) {
                        arr.push(start)
                        arr.push(endIndex)
                    },
                    ontextentity(codepoint: number, endIndex: number) {
                    },
                }
                let tokenizer = new Tokenizer({
                    xmlMode: true,
                    decodeEntities: true,
                }, callbacks);

                tokenizer.write('<html><head><title>My Title</title></head><body><h1>Hello World!</h1></body></html');
                tokenizer.end()
            })
        })

        it('tokenizer_reset', 0, () => {
            return new Promise<void>((resolve, reject) => {
                let arr: Array<number> = new Array()
                const callbacks: Callbacks = {
                    onattribdata(start: number, endIndex: number) {
                    },
                    onattribentity(codepoint: number) {
                    },
                    onattribend(quote: QuoteType, endIndex: number) {
                    },
                    onattribname(start: number, endIndex: number) {
                    },
                    oncdata(start: number, endIndex: number, endOffset: number) {
                    },
                    onclosetag(start: number, endIndex: number) {
                    },
                    oncomment(start: number, endIndex: number, endOffset: number) {
                    },
                    ondeclaration(start: number, endIndex: number) {
                    },
                    onend() {
                        expect([19, 27, 52, 64, 19, 27, 52, 64]).assertDeepEquals(arr)
                        resolve()
                    },
                    onopentagend(endIndex: number) {
                    },
                    onopentagname(start: number, endIndex: number) {
                    },
                    onprocessinginstruction(start: number, endIndex: number) {
                    },
                    onselfclosingtag(endIndex: number) {
                    },
                    ontext(start: number, endIndex: number) {
                        console.info(`htmlparser2--${start} /${endIndex}`)
                        arr.push(start)
                        arr.push(endIndex)
                    },
                    ontextentity(codepoint: number, endIndex: number) {
                    },
                }
                let tokenizer = new Tokenizer({
                    xmlMode: true,
                    decodeEntities: true,
                }, callbacks);

                tokenizer.write('<html><head><title>My Title</title></head><body><h1>Hello World!</h1></body></html');
                tokenizer.reset()
                tokenizer.write('<html><head><title>My Title</title></head><body><h1>Hello World!</h1></body></html');
                tokenizer.end()
            })
        })

        it('tokenizer_pause', 0, () => {
            return new Promise<void>((resolve, reject) => {
                let arr: Array<number> = new Array()
                const callbacks: Callbacks = {
                    onattribdata(start: number, endIndex: number) {
                    },
                    onattribentity(codepoint: number) {
                    },
                    onattribend(quote: QuoteType, endIndex: number) {
                    },
                    onattribname(start: number, endIndex: number) {
                    },
                    oncdata(start: number, endIndex: number, endOffset: number) {
                    },
                    onclosetag(start: number, endIndex: number) {
                    },
                    oncomment(start: number, endIndex: number, endOffset: number) {
                    },
                    ondeclaration(start: number, endIndex: number) {
                    },
                    onend() {
                        expect([19, 27, 52, 64, 101, 109, 134, 146]).assertDeepEquals(arr)
                        resolve()
                    },
                    onopentagend(endIndex: number) {
                    },
                    onopentagname(start: number, endIndex: number) {
                    },
                    onprocessinginstruction(start: number, endIndex: number) {
                    },
                    onselfclosingtag(endIndex: number) {
                    },
                    ontext(start: number, endIndex: number) {
                        console.info(`htmlparser2--${start} /${endIndex}`)
                        arr.push(start)
                        arr.push(endIndex)
                    },
                    ontextentity(codepoint: number, endIndex: number) {
                    },
                }
                let tokenizer = new Tokenizer({
                    xmlMode: true,
                    decodeEntities: true,
                }, callbacks);

                tokenizer.write('<html><head><title>My Title</title></head><body><h1>Hello World!</h1></body></html');
                tokenizer.pause()
                tokenizer.write('<html><head><title>My Title</title></head><body><h1>Hello World!</h1></body></html');
                expect([19, 27, 52, 64]).assertDeepEquals(arr)
                tokenizer.resume()
                tokenizer.end()
            })
        })

        it('tokenizer_resume', 0, () => {
            return new Promise<void>((resolve, reject) => {
                let arr: Array<number> = new Array()
                const callbacks: Callbacks = {
                    onattribdata(start: number, endIndex: number) {
                    },
                    onattribentity(codepoint: number) {
                    },
                    onattribend(quote: QuoteType, endIndex: number) {
                    },
                    onattribname(start: number, endIndex: number) {
                    },
                    oncdata(start: number, endIndex: number, endOffset: number) {
                    },
                    onclosetag(start: number, endIndex: number) {
                    },
                    oncomment(start: number, endIndex: number, endOffset: number) {
                    },
                    ondeclaration(start: number, endIndex: number) {
                    },
                    onend() {
                        expect([19, 27, 52, 64]).assertDeepEquals(arr)
                        resolve()
                    },
                    onopentagend(endIndex: number) {
                    },
                    onopentagname(start: number, endIndex: number) {
                    },
                    onprocessinginstruction(start: number, endIndex: number) {
                    },
                    onselfclosingtag(endIndex: number) {
                    },
                    ontext(start: number, endIndex: number) {
                        arr.push(start)
                        arr.push(endIndex)
                    },
                    ontextentity(codepoint: number, endIndex: number) {
                    },
                }
                let tokenizer = new Tokenizer({
                    xmlMode: true,
                    decodeEntities: true,
                }, callbacks);

                tokenizer.pause()
                tokenizer.write('<html><head><title>My Title</title></head><body><h1>Hello World!</h1></body></html');
                expect([]).assertDeepEquals(arr)
                tokenizer.resume()
                expect([19, 27, 52, 64]).assertDeepEquals(arr)
                tokenizer.end()
            })
        })
    })
}