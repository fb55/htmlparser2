# htmlparser2

## Introduction
> Based on the open source library htmlparser2, this project uses TypeScript to implement similar capabilities. It provides OpenHarmony with an efficient HTML parser.

## How to Install
```shell
ohpm install @ohos/htmlparser2
```
For details about the OpenHarmony ohpm environment configuration, see [OpenHarmony HAR](https://gitcode.com/openharmony-tpc/docs/blob/master/OpenHarmony_har_usage.en.md).

## How to Use 

- Create Partial\<Handler>,(helper.ts).

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

- Parse HTML.

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

- Parse HTML into a document.

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

- Create a Parser instance with a DOM processor.

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

- Parse a string of the feed type.

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

- Decompose an HTML document into tokens.

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

## Available APIs
1. Parses data and returns the generated document.
   `parseDocument(data: string, options?: Options): Document`
2. Creates a Parser instance with a DOM processor.
   `createDocumentStream(callback: (error: Error | null, document: Document) => void, options?: Options, elementCallback?: (element: Element) => void): Parser`
3. Parses a string of the feed type.
   `parseFeed(feed: string, options: Options = parseFeedDefaultOptions,): Feed | null`
4. Finishes the parsing.
   `parseComplete(data: string): void`
5. Writes data to start parsing.
   `write(chunk: string): void`
6. Ends the buffer and clears the stack
   `end(chunk?: string): void`
7. Pauses parsing.
   `pause(): void `
8. Resumes parsing.
   `resume(): void`
9. Resets the parser.
   `reset(): void`
10. Writes data to start parsing.
    `write(chunk: string): void`
11. Ends parsing.
    `end(): void`
12. Pauses parsing.
    `pause(): void `
13. Resumes parsing.
    `resume(): void`
14. Resets the parser.
    `reset(): void`

## About obfuscation
- Code obfuscation, please see[Code Obfuscation](https://docs.openharmony.cn/pages/v5.0/zh-cn/application-dev/arkts-utils/source-obfuscation.md)
- If you want the htmlparser2 library not to be obfuscated during code obfuscation, you need to add corresponding exclusion rules in the obfuscation rule configuration file obfuscation-rules.txt：
```
-keep
./oh_modules/@ohos/htmlparser2
```

## Constraints
This project has been verified in the following version:

- DevEco Studio: NEXT Beta1-5.0.3.806, SDK:API12 Release(5.0.0.66)
- DevEco Studio: 4.1 Canary(4.1.3.317)，OpenHarmony SDK:API11 (4.1.0.36)

## Directory Structure
````
|---- htmlparser2
|   |---- entry  # Sample code
|   |---- library # Core library code
|   |---- README.md  # Readme
|   |---- README_zh.md  # Readme
|   |---- README.OpenSource  # Open Source Description
|   |---- CHANGELOG.md  # Changelog             
````

## How to Contribute
If you find any problem during the use, submit an [issue](https://gitcode.com/openharmony-tpc/openharmony_tpc_samples/issues) or a [PR](https://gitcode.com/openharmony-tpc/openharmony_tpc_samples/pulls).

## License
This project is licensed under [MIT License 2.0](https://gitcode.com/openharmony-tpc/openharmony_tpc_samples/blob/master/htmlparser2/LICENSE).
