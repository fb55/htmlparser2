# htmlparser2

## 简介
> htmlparser2 是一个快速高效的HTML解析器, 并用JavaScript语言实现了相关功能，本工程基于开源库htmlparser2进行修改适配OpenHarmony的组件工程。

## 下载安装
```shell
ohpm install @ohos/htmlparser2
```
OpenHarmony ohpm环境配置等更多内容，请参考 [如何安装OpenHarmony ohpm包](https://gitcode.com/openharmony-tpc/docs/blob/master/OpenHarmony_har_usage.md) 。

## 使用说明

### 引用及使用

- 创建Partial<Handler>,(helper.ts)

```
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
```

- 解析html

```
  import * as helper from "./helper";
  const handler = helper.getEventCollector((error, actual: ESObject) => {
      if (error) {
         return
      }

      if (actual.$event == "text") {
         
      }

      if (actual.$event == "end") {
          expect(arr).assertDeepEquals(["Xyz ", "const foo = '<<bar>>';"])
          resolve()
      }
  });
  const parser = new Parser(handler);
  parser.write("Xyz <script type='text/javascript'>const foo = '<<bar>>';</script>",);
  parser.end();
```

- 将html解析成Document

```
   let dom: Document = parseDocument(html);
   let element = DomUtils.getElementsByTagName('style', dom);
   let text = DomUtils.textContent(element);
   this.result += "text:" + text + "\r\n"
   let isTag = DomUtils.isTag(element[0]);
   this.result += "isTag:" + isTag + "\r\n"
   let isCDATA = DomUtils.isCDATA(element[0]);
   this.result += "isCDATA:" + isCDATA + "\r\n"
   let isText = DomUtils.isText(element[0]);
   this.result += "isText:" + isText + "\r\n"
   let isComment = DomUtils.isComment(element[0]);
```

- 创建一个Parser实例，并附加一个DOM处理程序

```
   let parser: Parser = createDocumentStream((error: Error | null, dom: Document) => {
       if (!!error) {
           this.result = JSON.stringify(error)
           return
       }
       let element = DomUtils.getElementsByTagName('style', dom);
       let text = DomUtils.textContent(element);
       this.result += "text:" + text + "\r\n"
       let isTag = DomUtils.isTag(element[0]);
       this.result += "isTag:" + isTag + "\r\n"
       let isCDATA = DomUtils.isCDATA(element[0]);
       this.result += "isCDATA:" + isCDATA + "\r\n"
       let isText = DomUtils.isText(element[0]);
       this.result += "isText:" + isText + "\r\n"
       let isComment = DomUtils.isComment(element[0]);
       this.result += "isComment:" + isComment + "\r\n"
   });
   parser.write(html);
   parser.end();
```

- 解析Feed

```
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

    let feed: Feed | null = parseFeed(rssFeed)
    if (!!feed) {
        expect("rss").assertEqual(feed.type)
        expect("Liftoff News").assertEqual(feed.title)
        expect("http://liftoff.msfc.nasa.gov/p").assertEqual(feed.link)
        expect("Liftoff to Space Exploration.").assertEqual(feed.description)
        expect("editor@example.com").assertEqual(feed.author)
    } else {
        expect().assertFail()
    }
```

- 将HTML文档分解成一个个的标记(tokens)

```
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
            this.result += `start:${start}\r\n endIndex:${endIndex}`
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
```

## 接口说明
1. 解析数据，返回生成的Document
   `parseDocument(data: string, options?: Options): Document`
2. 创建一个带有附加的DOM处理器的解析器实例
   `createDocumentStream(callback: (error: Error | null, document: Document) => void, options?: Options, elementCallback?: (element: Element) => void): Parser`
3. 解析Feed类型的字符串
   `parseFeed(feed: string, options: Options = parseFeedDefaultOptions,): Feed | null`
4. 解析完成
   `parseComplete(data: string): void`
5. 写入数据开始解析
   `write(chunk: string): void`
6. 缓冲区的末尾并清除堆栈
   `end(chunk?: string): void`
7. 暂停分析
   `pause(): void `
8. 重新开始解析
   `resume(): void`
9. 重置解析器
   `reset(): void`
10. 写入数据开始解析
    `write(chunk: string): void`
11. 结束解析
    `end(): void`
12. 暂停分析
    `pause(): void `
13. 重新开始解析
    `resume(): void`
14. 重置解析器
    `reset(): void`

## 关于混淆
- 代码混淆，请查看[代码混淆简介](https://docs.openharmony.cn/pages/v5.0/zh-cn/application-dev/arkts-utils/source-obfuscation.md)
- 如果希望htmlparser2库在代码混淆过程中不会被混淆，需要在混淆规则配置文件obfuscation-rules.txt中添加相应的排除规则：
```
-keep
./oh_modules/@ohos/htmlparser2
```

## 约束与限制
在下述版本验证通过：

- DevEco Studio: NEXT Beta1-5.0.3.806, SDK:API12 Release(5.0.0.66)
- DevEco Studio: 4.1 Canary(4.1.3.317)，OpenHarmony SDK:API11 (4.1.0.36)

## 目录结构
````
|---- htmlparser2
|   |---- entry  # 示例代码文件夹
|   |---- library # 核心库代码
|   |---- README.md  # 安装使用方法
|   |---- README_zh.md  # 安装使用方法
|   |---- README.OpenSource  # 开源说明
|   |---- CHANGELOG.md  # 更新日志              
````

## 贡献代码
使用过程中发现任何问题都可以提 [Issue](https://gitcode.com/openharmony-tpc/openharmony_tpc_samples/issues) 给我们，当然，我们也非常欢迎你给我们发 [PR](https://gitcode.com/openharmony-tpc/openharmony_tpc_samples/pulls) 。

## 开源协议
本项目基于 [MIT License 2.0](https://gitcode.com/openharmony-tpc/openharmony_tpc_samples/blob/master/htmlparser2/LICENSE) ，请自由地享受和参与开源。

