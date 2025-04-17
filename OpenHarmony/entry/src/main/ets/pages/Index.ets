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
import { Callbacks, QuoteType } from 'htmlparser2/src/main/ets/esm/Tokenizer'
import * as helper from './helper'
import { Element } from 'domhandler';

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

@Entry
@Component
struct Index {
    @State result: string = "";
    str: string = '';
    scroller: Scroller = new Scroller()

    build() {
        Stack({ alignContent: Alignment.TopStart }) {
            Scroll(this.scroller) {
                Column() {
                    Text($r('app.string.Parsing_HTML'))
                        .width('90%')
                        .height(60)
                        .backgroundColor(0xFFFFFF)
                        .borderRadius(15)
                        .fontSize(16)
                        .textAlign(TextAlign.Center)
                        .margin({ top: 20 })
                        .onClick(event => {
                            this.result = "";
                            let arr: Array<string> = new Array()
                            const handler = helper.getEventCollector((error, actual: ESObject) => {
                                if (error) {
                                    this.result = this.result + getContext().resourceManager.getStringByNameSync('Parse_fail') + "：" + JSON.stringify(error)
                                    return
                                }

                                if (actual.$event == "text") {
                                    arr.push(actual.data)
                                }

                                if (actual.$event == "end") {
                                    this.result = JSON.stringify(arr);
                                }
                            });
                            const parser: Parser = new Parser(handler);
                            parser.write("china <script type='text/javascript'>const foo = '<<bar>>';</script>",);
                            parser.end();
                        });

                    Text($r('app.string.ParseComplete'))
                        .width('90%')
                        .height(60)
                        .backgroundColor(0xFFFFFF)
                        .borderRadius(15)
                        .fontSize(16)
                        .textAlign(TextAlign.Center)
                        .margin({ top: 20 })
                        .onClick(event => {
                            this.result = "";

                            let arr: Array<string> = new Array()
                            let parser: Parser | null = null

                            const handler = helper.getEventCollector((error, actual: ESObject) => {
                                if (error) {
                                    this.result = this.result + getContext().resourceManager.getStringByNameSync('Parse_fail') + "：" + JSON.stringify(error)
                                    return
                                }

                                if (actual.$event == "text") {
                                    arr.push(actual.data)
                                }

                                if (actual.$event == "end") {
                                    this.result = JSON.stringify(arr);
                                }
                            });
                            parser = new Parser(handler);
                            parser.parseComplete("Xyz <script type='text/javascript'>const foo = '<<bar>>';</script>")
                        });

                    Text($r('app.string.ParseDocument'))
                        .width('90%')
                        .height(60)
                        .backgroundColor(0xFFFFFF)
                        .borderRadius(15)
                        .fontSize(16)
                        .textAlign(TextAlign.Center)
                        .margin({ top: 20 })
                        .onClick(event => {
                            this.result = ""
                            let dom: Document = parseDocument(html);
                            let element: Element[] = DomUtils.getElementsByTagName('style', dom);
                            let text:string = DomUtils.textContent(element);
                            this.result += "text:" + text + "\r\n"
                            let isTag :boolean= DomUtils.isTag(element[0]);
                            this.result += "isTag:" + isTag + "\r\n"
                            let isCDATA:boolean = DomUtils.isCDATA(element[0]);
                            this.result += "isCDATA:" + isCDATA + "\r\n"
                            let isText:boolean = DomUtils.isText(element[0]);
                            this.result += "isText:" + isText + "\r\n"
                            let isComment :boolean= DomUtils.isComment(element[0]);
                            this.result += "isComment:" + isComment + "\r\n"
                        });

                    Text($r('app.string.Parse_feed_string'))
                        .width('90%')
                        .height(60)
                        .backgroundColor(0xFFFFFF)
                        .borderRadius(15)
                        .fontSize(16)
                        .textAlign(TextAlign.Center)
                        .margin({ top: 20 })
                        .onClick(event => {
                            this.result = ""
                            let feed: Feed | null = parseFeed(rssFeed)
                            if (!!feed) {
                                this.result = JSON.stringify(feed)
                            } else {
                                this.result = "feed is null"
                            }
                        });

                    Text($r('app.string.createDocumentStream'))
                        .width('90%')
                        .height(60)
                        .backgroundColor(0xFFFFFF)
                        .borderRadius(15)
                        .fontSize(16)
                        .textAlign(TextAlign.Center)
                        .margin({ top: 20 })
                        .onClick(event => {
                            this.result = ""
                            let parser: Parser = createDocumentStream((error: Error | null, dom: Document) => {
                                if (!!error) {
                                    this.result = JSON.stringify(error)
                                    return
                                }
                                let element : Element[]= DomUtils.getElementsByTagName('style', dom);
                                let text:string = DomUtils.textContent(element);
                                this.result += "text:" + text + "\r\n"
                                let isTag :boolean= DomUtils.isTag(element[0]);
                                this.result += "isTag:" + isTag + "\r\n"
                                let isCDATA :boolean= DomUtils.isCDATA(element[0]);
                                this.result += "isCDATA:" + isCDATA + "\r\n"
                                let isText:boolean = DomUtils.isText(element[0]);
                                this.result += "isText:" + isText + "\r\n"
                                let isComment :boolean= DomUtils.isComment(element[0]);
                                this.result += "isComment:" + isComment + "\r\n"
                            });
                            parser.write(html);
                            parser.end();
                        });

                    Text($r('app.string.Decompose_HTML_documents_into_individual_tokens'))
                        .width('90%')
                        .height(60)
                        .backgroundColor(0xFFFFFF)
                        .borderRadius(15)
                        .fontSize(16)
                        .textAlign(TextAlign.Center)
                        .margin({ top: 20 })
                        .onClick(event => {
                            this.result = ""
                            let that = this
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
                                    that.result += `start:${start}\r\nendIndex:${endIndex}\r\n`
                                },
                                ontextentity(codepoint: number, endIndex: number) {
                                },
                            }
                            let tokenizer:Tokenizer = new Tokenizer({
                                xmlMode: true,
                                decodeEntities: true,
                            }, callbacks);

                            tokenizer.write('<html><head><title>My Title</title></head><body><h1>Hello World!</h1></body></html');
                            tokenizer.end()
                        });

                    Text(getContext().resourceManager.getStringByNameSync('Parse_results') + " :\r\n  " + this.result)
                        .fontSize(15)
                        .margin({ top: 55, left: 10, right: 10 })

                }.width('100%');
            }
            .scrollable(ScrollDirection.Vertical).scrollBar(BarState.On)
            .scrollBarColor(Color.Gray).scrollBarWidth(30);
        }.width('100%').height('100%').backgroundColor(0xDCDCDC)
    }
}