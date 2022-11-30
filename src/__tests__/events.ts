import { Parser, type ParserOptions } from "../index.js";
import * as helper from "../__fixtures__/test-helper.js";

function runTest(input: string, options: ParserOptions, expected: unknown) {
    let calledTwice = false;

    return new Promise<void>((resolve, reject) => {
        helper.writeToParser(
            helper.getEventCollector((error, actual) => {
                if (error) {
                    return reject(error);
                }

                expect(actual).toStrictEqual(expected);

                if (calledTwice) {
                    resolve();
                } else {
                    calledTwice = true;
                }
            }),
            options,
            input
        );
    });
}

describe("Events", () => {
    it("simple", () =>
        runTest("<h1 class=test>adsf</h1>", {}, [
            { event: "opentagname", startIndex: 0, endIndex: 3, data: ["h1"] },
            {
                event: "attribute",
                startIndex: 4,
                endIndex: 14,
                data: ["class", "test", null],
            },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 14,
                data: ["h1", { class: "test" }, false],
            },
            { event: "text", startIndex: 15, endIndex: 18, data: ["adsf"] },
            {
                event: "closetag",
                startIndex: 19,
                endIndex: 23,
                data: ["h1", false],
            },
        ]));

    it("Template script tags", () =>
        runTest(
            '<p><script type="text/template"><h1>Heading1</h1></script></p>',
            {},
            [
                {
                    event: "opentagname",
                    startIndex: 0,
                    endIndex: 2,
                    data: ["p"],
                },
                {
                    event: "opentag",
                    startIndex: 0,
                    endIndex: 2,
                    data: ["p", {}, false],
                },
                {
                    event: "opentagname",
                    startIndex: 3,
                    endIndex: 10,
                    data: ["script"],
                },
                {
                    event: "attribute",
                    startIndex: 11,
                    endIndex: 30,
                    data: ["type", "text/template", '"'],
                },
                {
                    event: "opentag",
                    startIndex: 3,
                    endIndex: 31,
                    data: ["script", { type: "text/template" }, false],
                },
                {
                    event: "text",
                    startIndex: 32,
                    endIndex: 48,
                    data: ["<h1>Heading1</h1>"],
                },
                {
                    event: "closetag",
                    startIndex: 49,
                    endIndex: 57,
                    data: ["script", false],
                },
                {
                    event: "closetag",
                    startIndex: 58,
                    endIndex: 61,
                    data: ["p", false],
                },
            ]
        ));

    it("Lowercase tags", () =>
        runTest("<H1 class=test>adsf</H1>", { lowerCaseTags: true }, [
            { event: "opentagname", startIndex: 0, endIndex: 3, data: ["h1"] },
            {
                event: "attribute",
                startIndex: 4,
                endIndex: 14,
                data: ["class", "test", null],
            },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 14,
                data: ["h1", { class: "test" }, false],
            },
            { event: "text", startIndex: 15, endIndex: 18, data: ["adsf"] },
            {
                event: "closetag",
                startIndex: 19,
                endIndex: 23,
                data: ["h1", false],
            },
        ]));

    it("CDATA", () =>
        runTest(
            "<tag><![CDATA[ asdf ><asdf></adsf><> fo]]></tag><![CD>",
            { xmlMode: true },
            [
                {
                    event: "opentagname",
                    startIndex: 0,
                    endIndex: 4,
                    data: ["tag"],
                },
                {
                    event: "opentag",
                    startIndex: 0,
                    endIndex: 4,
                    data: ["tag", {}, false],
                },
                { event: "cdatastart", startIndex: 5, endIndex: 41, data: [] },
                {
                    event: "text",
                    startIndex: 5,
                    endIndex: 41,
                    data: [" asdf ><asdf></adsf><> fo"],
                },
                { event: "cdataend", startIndex: 5, endIndex: 41, data: [] },
                {
                    event: "closetag",
                    startIndex: 42,
                    endIndex: 47,
                    data: ["tag", false],
                },
                {
                    event: "processinginstruction",
                    startIndex: 48,
                    endIndex: 53,
                    data: ["![CD", "![CD"],
                },
            ]
        ));

    it("CDATA (inside special)", () =>
        runTest(
            "<script>/*<![CDATA[*/ asdf ><asdf></adsf><> fo/*]]>*/</script>",
            {},
            [
                {
                    event: "opentagname",
                    startIndex: 0,
                    endIndex: 7,
                    data: ["script"],
                },
                {
                    event: "opentag",
                    startIndex: 0,
                    endIndex: 7,
                    data: ["script", {}, false],
                },
                {
                    event: "text",
                    startIndex: 8,
                    endIndex: 52,
                    data: ["/*<![CDATA[*/ asdf ><asdf></adsf><> fo/*]]>*/"],
                },
                {
                    event: "closetag",
                    startIndex: 53,
                    endIndex: 61,
                    data: ["script", false],
                },
            ]
        ));

    it("leading lt", () =>
        runTest(">a>", {}, [
            { event: "text", startIndex: 0, endIndex: 2, data: [">a>"] },
        ]));

    it("end slash: void element ending with />", () =>
        runTest("<hr / ><p>Hold the line.", {}, [
            { event: "opentagname", startIndex: 0, endIndex: 3, data: ["hr"] },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 6,
                data: ["hr", {}, false],
            },
            {
                event: "closetag",
                startIndex: 0,
                endIndex: 6,
                data: ["hr", true],
            },
            { event: "opentagname", startIndex: 7, endIndex: 9, data: ["p"] },
            {
                event: "opentag",
                startIndex: 7,
                endIndex: 9,
                data: ["p", {}, false],
            },
            {
                event: "text",
                startIndex: 10,
                endIndex: 23,
                data: ["Hold the line."],
            },
            {
                event: "closetag",
                startIndex: 24,
                endIndex: 24,
                data: ["p", true],
            },
        ]));

    it("end slash: void element ending with >", () =>
        runTest("<hr   ><p>Hold the line.", {}, [
            { event: "opentagname", startIndex: 0, endIndex: 3, data: ["hr"] },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 6,
                data: ["hr", {}, false],
            },
            {
                event: "closetag",
                startIndex: 0,
                endIndex: 6,
                data: ["hr", true],
            },
            { event: "opentagname", startIndex: 7, endIndex: 9, data: ["p"] },
            {
                event: "opentag",
                startIndex: 7,
                endIndex: 9,
                data: ["p", {}, false],
            },
            {
                event: "text",
                startIndex: 10,
                endIndex: 23,
                data: ["Hold the line."],
            },
            {
                event: "closetag",
                startIndex: 24,
                endIndex: 24,
                data: ["p", true],
            },
        ]));

    it("end slash: void element ending with >, xmlMode=true", () =>
        runTest("<hr   ><p>Hold the line.", { xmlMode: true }, [
            { event: "opentagname", startIndex: 0, endIndex: 3, data: ["hr"] },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 6,
                data: ["hr", {}, false],
            },
            { event: "opentagname", startIndex: 7, endIndex: 9, data: ["p"] },
            {
                event: "opentag",
                startIndex: 7,
                endIndex: 9,
                data: ["p", {}, false],
            },
            {
                event: "text",
                startIndex: 10,
                endIndex: 23,
                data: ["Hold the line."],
            },
            {
                event: "closetag",
                startIndex: 24,
                endIndex: 24,
                data: ["p", true],
            },
            {
                event: "closetag",
                startIndex: 24,
                endIndex: 24,
                data: ["hr", true],
            },
        ]));

    it("end slash: non-void element ending with />", () =>
        runTest("<xx / ><p>Hold the line.", {}, [
            { event: "opentagname", startIndex: 0, endIndex: 3, data: ["xx"] },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 6,
                data: ["xx", {}, false],
            },
            { event: "opentagname", startIndex: 7, endIndex: 9, data: ["p"] },
            {
                event: "opentag",
                startIndex: 7,
                endIndex: 9,
                data: ["p", {}, false],
            },
            {
                event: "text",
                startIndex: 10,
                endIndex: 23,
                data: ["Hold the line."],
            },
            {
                event: "closetag",
                startIndex: 24,
                endIndex: 24,
                data: ["p", true],
            },
            {
                event: "closetag",
                startIndex: 24,
                endIndex: 24,
                data: ["xx", true],
            },
        ]));

    it("end slash: non-void element ending with />, xmlMode=true", () =>
        runTest("<xx / ><p>Hold the line.", { xmlMode: true }, [
            { event: "opentagname", startIndex: 0, endIndex: 3, data: ["xx"] },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 6,
                data: ["xx", {}, false],
            },
            {
                event: "closetag",
                startIndex: 0,
                endIndex: 6,
                data: ["xx", true],
            },
            { event: "opentagname", startIndex: 7, endIndex: 9, data: ["p"] },
            {
                event: "opentag",
                startIndex: 7,
                endIndex: 9,
                data: ["p", {}, false],
            },
            {
                event: "text",
                startIndex: 10,
                endIndex: 23,
                data: ["Hold the line."],
            },
            {
                event: "closetag",
                startIndex: 24,
                endIndex: 24,
                data: ["p", true],
            },
        ]));

    it("end slash: non-void element ending with />, recognizeSelfClosing=true", () =>
        runTest("<xx / ><p>Hold the line.", { recognizeSelfClosing: true }, [
            { event: "opentagname", startIndex: 0, endIndex: 3, data: ["xx"] },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 6,
                data: ["xx", {}, false],
            },
            {
                event: "closetag",
                startIndex: 0,
                endIndex: 6,
                data: ["xx", true],
            },
            { event: "opentagname", startIndex: 7, endIndex: 9, data: ["p"] },
            {
                event: "opentag",
                startIndex: 7,
                endIndex: 9,
                data: ["p", {}, false],
            },
            {
                event: "text",
                startIndex: 10,
                endIndex: 23,
                data: ["Hold the line."],
            },
            {
                event: "closetag",
                startIndex: 24,
                endIndex: 24,
                data: ["p", true],
            },
        ]));

    it("end slash: as part of attrib value of void element", () =>
        runTest("<img src=gif.com/123/><p>Hold the line.", {}, [
            { event: "opentagname", startIndex: 0, endIndex: 4, data: ["img"] },
            {
                event: "attribute",
                startIndex: 5,
                endIndex: 21,
                data: ["src", "gif.com/123/", null],
            },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 21,
                data: ["img", { src: "gif.com/123/" }, false],
            },
            {
                event: "closetag",
                startIndex: 0,
                endIndex: 21,
                data: ["img", true],
            },
            { event: "opentagname", startIndex: 22, endIndex: 24, data: ["p"] },
            {
                event: "opentag",
                startIndex: 22,
                endIndex: 24,
                data: ["p", {}, false],
            },
            {
                event: "text",
                startIndex: 25,
                endIndex: 38,
                data: ["Hold the line."],
            },
            {
                event: "closetag",
                startIndex: 39,
                endIndex: 39,
                data: ["p", true],
            },
        ]));

    it("end slash: as part of attrib value of non-void element", () =>
        runTest("<a href=http://test.com/>Foo</a><p>Hold the line.", {}, [
            { event: "opentagname", startIndex: 0, endIndex: 2, data: ["a"] },
            {
                event: "attribute",
                startIndex: 3,
                endIndex: 24,
                data: ["href", "http://test.com/", null],
            },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 24,
                data: ["a", { href: "http://test.com/" }, false],
            },
            { event: "text", startIndex: 25, endIndex: 27, data: ["Foo"] },
            {
                event: "closetag",
                startIndex: 28,
                endIndex: 31,
                data: ["a", false],
            },
            { event: "opentagname", startIndex: 32, endIndex: 34, data: ["p"] },
            {
                event: "opentag",
                startIndex: 32,
                endIndex: 34,
                data: ["p", {}, false],
            },
            {
                event: "text",
                startIndex: 35,
                endIndex: 48,
                data: ["Hold the line."],
            },
            {
                event: "closetag",
                startIndex: 49,
                endIndex: 49,
                data: ["p", true],
            },
        ]));

    it("Implicit close tags", () =>
        runTest(
            "<ol><li class=test><div><table style=width:100%><tr><th>TH<td colspan=2><h3>Heading</h3><tr><td><div>Div</div><td><div>Div2</div></table></div><li><div><h3>Heading 2</h3></div></li></ol><p>Para<h4>Heading 4</h4><p><ul><li>Hi<li>bye</ul>",
            {},
            [
                {
                    event: "opentagname",
                    startIndex: 0,
                    endIndex: 3,
                    data: ["ol"],
                },
                {
                    event: "opentag",
                    startIndex: 0,
                    endIndex: 3,
                    data: ["ol", {}, false],
                },
                {
                    event: "opentagname",
                    startIndex: 4,
                    endIndex: 7,
                    data: ["li"],
                },
                {
                    event: "attribute",
                    startIndex: 8,
                    endIndex: 18,
                    data: ["class", "test", null],
                },
                {
                    event: "opentag",
                    startIndex: 4,
                    endIndex: 18,
                    data: ["li", { class: "test" }, false],
                },
                {
                    event: "opentagname",
                    startIndex: 19,
                    endIndex: 23,
                    data: ["div"],
                },
                {
                    event: "opentag",
                    startIndex: 19,
                    endIndex: 23,
                    data: ["div", {}, false],
                },
                {
                    event: "opentagname",
                    startIndex: 24,
                    endIndex: 30,
                    data: ["table"],
                },
                {
                    event: "attribute",
                    startIndex: 31,
                    endIndex: 47,
                    data: ["style", "width:100%", null],
                },
                {
                    event: "opentag",
                    startIndex: 24,
                    endIndex: 47,
                    data: ["table", { style: "width:100%" }, false],
                },
                {
                    event: "opentagname",
                    startIndex: 48,
                    endIndex: 51,
                    data: ["tr"],
                },
                {
                    event: "opentag",
                    startIndex: 48,
                    endIndex: 51,
                    data: ["tr", {}, false],
                },
                {
                    event: "opentagname",
                    startIndex: 52,
                    endIndex: 55,
                    data: ["th"],
                },
                {
                    event: "opentag",
                    startIndex: 52,
                    endIndex: 55,
                    data: ["th", {}, false],
                },
                { event: "text", startIndex: 56, endIndex: 57, data: ["TH"] },
                {
                    event: "closetag",
                    startIndex: 58,
                    endIndex: 61,
                    data: ["th", true],
                },
                {
                    event: "opentagname",
                    startIndex: 58,
                    endIndex: 61,
                    data: ["td"],
                },
                {
                    event: "attribute",
                    startIndex: 62,
                    endIndex: 71,
                    data: ["colspan", "2", null],
                },
                {
                    event: "opentag",
                    startIndex: 58,
                    endIndex: 71,
                    data: ["td", { colspan: "2" }, false],
                },
                {
                    event: "opentagname",
                    startIndex: 72,
                    endIndex: 75,
                    data: ["h3"],
                },
                {
                    event: "opentag",
                    startIndex: 72,
                    endIndex: 75,
                    data: ["h3", {}, false],
                },
                {
                    event: "text",
                    startIndex: 76,
                    endIndex: 82,
                    data: ["Heading"],
                },
                {
                    event: "closetag",
                    startIndex: 83,
                    endIndex: 87,
                    data: ["h3", false],
                },
                {
                    event: "closetag",
                    startIndex: 88,
                    endIndex: 91,
                    data: ["td", true],
                },
                {
                    event: "closetag",
                    startIndex: 88,
                    endIndex: 91,
                    data: ["tr", true],
                },
                {
                    event: "opentagname",
                    startIndex: 88,
                    endIndex: 91,
                    data: ["tr"],
                },
                {
                    event: "opentag",
                    startIndex: 88,
                    endIndex: 91,
                    data: ["tr", {}, false],
                },
                {
                    event: "opentagname",
                    startIndex: 92,
                    endIndex: 95,
                    data: ["td"],
                },
                {
                    event: "opentag",
                    startIndex: 92,
                    endIndex: 95,
                    data: ["td", {}, false],
                },
                {
                    event: "opentagname",
                    startIndex: 96,
                    endIndex: 100,
                    data: ["div"],
                },
                {
                    event: "opentag",
                    startIndex: 96,
                    endIndex: 100,
                    data: ["div", {}, false],
                },
                {
                    event: "text",
                    startIndex: 101,
                    endIndex: 103,
                    data: ["Div"],
                },
                {
                    event: "closetag",
                    startIndex: 104,
                    endIndex: 109,
                    data: ["div", false],
                },
                {
                    event: "closetag",
                    startIndex: 110,
                    endIndex: 113,
                    data: ["td", true],
                },
                {
                    event: "opentagname",
                    startIndex: 110,
                    endIndex: 113,
                    data: ["td"],
                },
                {
                    event: "opentag",
                    startIndex: 110,
                    endIndex: 113,
                    data: ["td", {}, false],
                },
                {
                    event: "opentagname",
                    startIndex: 114,
                    endIndex: 118,
                    data: ["div"],
                },
                {
                    event: "opentag",
                    startIndex: 114,
                    endIndex: 118,
                    data: ["div", {}, false],
                },
                {
                    event: "text",
                    startIndex: 119,
                    endIndex: 122,
                    data: ["Div2"],
                },
                {
                    event: "closetag",
                    startIndex: 123,
                    endIndex: 128,
                    data: ["div", false],
                },
                {
                    event: "closetag",
                    startIndex: 129,
                    endIndex: 136,
                    data: ["td", true],
                },
                {
                    event: "closetag",
                    startIndex: 129,
                    endIndex: 136,
                    data: ["tr", true],
                },
                {
                    event: "closetag",
                    startIndex: 129,
                    endIndex: 136,
                    data: ["table", false],
                },
                {
                    event: "closetag",
                    startIndex: 137,
                    endIndex: 142,
                    data: ["div", false],
                },
                {
                    event: "closetag",
                    startIndex: 143,
                    endIndex: 146,
                    data: ["li", true],
                },
                {
                    event: "opentagname",
                    startIndex: 143,
                    endIndex: 146,
                    data: ["li"],
                },
                {
                    event: "opentag",
                    startIndex: 143,
                    endIndex: 146,
                    data: ["li", {}, false],
                },
                {
                    event: "opentagname",
                    startIndex: 147,
                    endIndex: 151,
                    data: ["div"],
                },
                {
                    event: "opentag",
                    startIndex: 147,
                    endIndex: 151,
                    data: ["div", {}, false],
                },
                {
                    event: "opentagname",
                    startIndex: 152,
                    endIndex: 155,
                    data: ["h3"],
                },
                {
                    event: "opentag",
                    startIndex: 152,
                    endIndex: 155,
                    data: ["h3", {}, false],
                },
                {
                    event: "text",
                    startIndex: 156,
                    endIndex: 164,
                    data: ["Heading 2"],
                },
                {
                    event: "closetag",
                    startIndex: 165,
                    endIndex: 169,
                    data: ["h3", false],
                },
                {
                    event: "closetag",
                    startIndex: 170,
                    endIndex: 175,
                    data: ["div", false],
                },
                {
                    event: "closetag",
                    startIndex: 176,
                    endIndex: 180,
                    data: ["li", false],
                },
                {
                    event: "closetag",
                    startIndex: 181,
                    endIndex: 185,
                    data: ["ol", false],
                },
                {
                    event: "opentagname",
                    startIndex: 186,
                    endIndex: 188,
                    data: ["p"],
                },
                {
                    event: "opentag",
                    startIndex: 186,
                    endIndex: 188,
                    data: ["p", {}, false],
                },
                {
                    event: "text",
                    startIndex: 189,
                    endIndex: 192,
                    data: ["Para"],
                },
                {
                    event: "closetag",
                    startIndex: 193,
                    endIndex: 196,
                    data: ["p", true],
                },
                {
                    event: "opentagname",
                    startIndex: 193,
                    endIndex: 196,
                    data: ["h4"],
                },
                {
                    event: "opentag",
                    startIndex: 193,
                    endIndex: 196,
                    data: ["h4", {}, false],
                },
                {
                    event: "text",
                    startIndex: 197,
                    endIndex: 205,
                    data: ["Heading 4"],
                },
                {
                    event: "closetag",
                    startIndex: 206,
                    endIndex: 210,
                    data: ["h4", false],
                },
                {
                    event: "opentagname",
                    startIndex: 211,
                    endIndex: 213,
                    data: ["p"],
                },
                {
                    event: "opentag",
                    startIndex: 211,
                    endIndex: 213,
                    data: ["p", {}, false],
                },
                {
                    event: "closetag",
                    startIndex: 214,
                    endIndex: 217,
                    data: ["p", true],
                },
                {
                    event: "opentagname",
                    startIndex: 214,
                    endIndex: 217,
                    data: ["ul"],
                },
                {
                    event: "opentag",
                    startIndex: 214,
                    endIndex: 217,
                    data: ["ul", {}, false],
                },
                {
                    event: "opentagname",
                    startIndex: 218,
                    endIndex: 221,
                    data: ["li"],
                },
                {
                    event: "opentag",
                    startIndex: 218,
                    endIndex: 221,
                    data: ["li", {}, false],
                },
                { event: "text", startIndex: 222, endIndex: 223, data: ["Hi"] },
                {
                    event: "closetag",
                    startIndex: 224,
                    endIndex: 227,
                    data: ["li", true],
                },
                {
                    event: "opentagname",
                    startIndex: 224,
                    endIndex: 227,
                    data: ["li"],
                },
                {
                    event: "opentag",
                    startIndex: 224,
                    endIndex: 227,
                    data: ["li", {}, false],
                },
                {
                    event: "text",
                    startIndex: 228,
                    endIndex: 230,
                    data: ["bye"],
                },
                {
                    event: "closetag",
                    startIndex: 231,
                    endIndex: 235,
                    data: ["li", true],
                },
                {
                    event: "closetag",
                    startIndex: 231,
                    endIndex: 235,
                    data: ["ul", false],
                },
            ]
        ));

    it("attributes (no white space, no value, no quotes)", () =>
        runTest(
            '<button class="test0"title="test1" disabled value=test2>adsf</button>',
            {},
            [
                {
                    event: "opentagname",
                    startIndex: 0,
                    endIndex: 7,
                    data: ["button"],
                },
                {
                    event: "attribute",
                    startIndex: 8,
                    endIndex: 20,
                    data: ["class", "test0", '"'],
                },
                {
                    event: "attribute",
                    startIndex: 21,
                    endIndex: 33,
                    data: ["title", "test1", '"'],
                },
                {
                    event: "attribute",
                    startIndex: 35,
                    endIndex: 44,
                    data: ["disabled", ""],
                },
                {
                    event: "attribute",
                    startIndex: 44,
                    endIndex: 55,
                    data: ["value", "test2", null],
                },
                {
                    event: "opentag",
                    startIndex: 0,
                    endIndex: 55,
                    data: [
                        "button",
                        {
                            class: "test0",
                            title: "test1",
                            disabled: "",
                            value: "test2",
                        },
                        false,
                    ],
                },
                { event: "text", startIndex: 56, endIndex: 59, data: ["adsf"] },
                {
                    event: "closetag",
                    startIndex: 60,
                    endIndex: 68,
                    data: ["button", false],
                },
            ]
        ));

    it("crazy attribute", () =>
        runTest("<p < = '' FAIL>stuff</p><a", {}, [
            { event: "opentagname", startIndex: 0, endIndex: 2, data: ["p"] },
            {
                event: "attribute",
                startIndex: 3,
                endIndex: 8,
                data: ["<", "", "'"],
            },
            {
                event: "attribute",
                startIndex: 10,
                endIndex: 14,
                data: ["fail", ""],
            },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 14,
                data: ["p", { "<": "", fail: "" }, false],
            },
            { event: "text", startIndex: 15, endIndex: 19, data: ["stuff"] },
            {
                event: "closetag",
                startIndex: 20,
                endIndex: 23,
                data: ["p", false],
            },
        ]));

    it("Scripts creating other scripts", () =>
        runTest(
            "<p><script>var str = '<script></'+'script>';</script></p>",
            {},
            [
                {
                    event: "opentagname",
                    startIndex: 0,
                    endIndex: 2,
                    data: ["p"],
                },
                {
                    event: "opentag",
                    startIndex: 0,
                    endIndex: 2,
                    data: ["p", {}, false],
                },
                {
                    event: "opentagname",
                    startIndex: 3,
                    endIndex: 10,
                    data: ["script"],
                },
                {
                    event: "opentag",
                    startIndex: 3,
                    endIndex: 10,
                    data: ["script", {}, false],
                },
                {
                    event: "text",
                    startIndex: 11,
                    endIndex: 43,
                    data: ["var str = '<script></'+'script>';"],
                },
                {
                    event: "closetag",
                    startIndex: 44,
                    endIndex: 52,
                    data: ["script", false],
                },
                {
                    event: "closetag",
                    startIndex: 53,
                    endIndex: 56,
                    data: ["p", false],
                },
            ]
        ));

    it("Long comment ending", () =>
        runTest("<meta id='before'><!-- text ---><meta id='after'>", {}, [
            {
                event: "opentagname",
                startIndex: 0,
                endIndex: 5,
                data: ["meta"],
            },
            {
                event: "attribute",
                startIndex: 6,
                endIndex: 16,
                data: ["id", "before", "'"],
            },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 17,
                data: ["meta", { id: "before" }, false],
            },
            {
                event: "closetag",
                startIndex: 0,
                endIndex: 17,
                data: ["meta", true],
            },
            {
                event: "comment",
                startIndex: 18,
                endIndex: 31,
                data: [" text -"],
            },
            { event: "commentend", startIndex: 18, endIndex: 31, data: [] },
            {
                event: "opentagname",
                startIndex: 32,
                endIndex: 37,
                data: ["meta"],
            },
            {
                event: "attribute",
                startIndex: 38,
                endIndex: 47,
                data: ["id", "after", "'"],
            },
            {
                event: "opentag",
                startIndex: 32,
                endIndex: 48,
                data: ["meta", { id: "after" }, false],
            },
            {
                event: "closetag",
                startIndex: 32,
                endIndex: 48,
                data: ["meta", true],
            },
        ]));

    it("Long CDATA ending", () =>
        runTest(
            "<before /><tag><![CDATA[ text ]]]></tag><after />",
            { xmlMode: true },
            [
                {
                    event: "opentagname",
                    startIndex: 0,
                    endIndex: 7,
                    data: ["before"],
                },
                {
                    event: "opentag",
                    startIndex: 0,
                    endIndex: 9,
                    data: ["before", {}, false],
                },
                {
                    event: "closetag",
                    startIndex: 0,
                    endIndex: 9,
                    data: ["before", true],
                },
                {
                    event: "opentagname",
                    startIndex: 10,
                    endIndex: 14,
                    data: ["tag"],
                },
                {
                    event: "opentag",
                    startIndex: 10,
                    endIndex: 14,
                    data: ["tag", {}, false],
                },
                { event: "cdatastart", startIndex: 15, endIndex: 33, data: [] },
                {
                    event: "text",
                    startIndex: 15,
                    endIndex: 33,
                    data: [" text ]"],
                },
                { event: "cdataend", startIndex: 15, endIndex: 33, data: [] },
                {
                    event: "closetag",
                    startIndex: 34,
                    endIndex: 39,
                    data: ["tag", false],
                },
                {
                    event: "opentagname",
                    startIndex: 40,
                    endIndex: 46,
                    data: ["after"],
                },
                {
                    event: "opentag",
                    startIndex: 40,
                    endIndex: 48,
                    data: ["after", {}, false],
                },
                {
                    event: "closetag",
                    startIndex: 40,
                    endIndex: 48,
                    data: ["after", true],
                },
            ]
        ));

    it("Implicit open p and br tags", () =>
        runTest("<div>Hallo</p>World</br></ignore></div></p></br>", {}, [
            { event: "opentagname", startIndex: 0, endIndex: 4, data: ["div"] },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 4,
                data: ["div", {}, false],
            },
            { event: "text", startIndex: 5, endIndex: 9, data: ["Hallo"] },
            { event: "opentagname", startIndex: 10, endIndex: 13, data: ["p"] },
            {
                event: "opentag",
                startIndex: 10,
                endIndex: 13,
                data: ["p", {}, true],
            },
            {
                event: "closetag",
                startIndex: 10,
                endIndex: 13,
                data: ["p", false],
            },
            { event: "text", startIndex: 14, endIndex: 18, data: ["World"] },
            {
                event: "opentagname",
                startIndex: 19,
                endIndex: 23,
                data: ["br"],
            },
            {
                event: "opentag",
                startIndex: 19,
                endIndex: 23,
                data: ["br", {}, true],
            },
            {
                event: "closetag",
                startIndex: 19,
                endIndex: 23,
                data: ["br", false],
            },
            {
                event: "closetag",
                startIndex: 33,
                endIndex: 38,
                data: ["div", false],
            },
            { event: "opentagname", startIndex: 39, endIndex: 42, data: ["p"] },
            {
                event: "opentag",
                startIndex: 39,
                endIndex: 42,
                data: ["p", {}, true],
            },
            {
                event: "closetag",
                startIndex: 39,
                endIndex: 42,
                data: ["p", false],
            },
            {
                event: "opentagname",
                startIndex: 43,
                endIndex: 47,
                data: ["br"],
            },
            {
                event: "opentag",
                startIndex: 43,
                endIndex: 47,
                data: ["br", {}, true],
            },
            {
                event: "closetag",
                startIndex: 43,
                endIndex: 47,
                data: ["br", false],
            },
        ]));

    it("lt followed by whitespace", () =>
        runTest("a < b", {}, [
            { event: "text", startIndex: 0, endIndex: 4, data: ["a < b"] },
        ]));

    it("double attribute", () =>
        runTest("<h1 class=test class=boo></h1>", {}, [
            { event: "opentagname", startIndex: 0, endIndex: 3, data: ["h1"] },
            {
                event: "attribute",
                startIndex: 4,
                endIndex: 14,
                data: ["class", "test", null],
            },
            {
                event: "attribute",
                startIndex: 15,
                endIndex: 24,
                data: ["class", "boo", null],
            },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 24,
                data: ["h1", { class: "test" }, false],
            },
            {
                event: "closetag",
                startIndex: 25,
                endIndex: 29,
                data: ["h1", false],
            },
        ]));

    it("numeric entities", () =>
        runTest("&#x61;&#x62&#99;&#100&#x66g&#x;&#x68", {}, [
            {
                event: "text",
                startIndex: 0,
                endIndex: 35,
                data: ["abcdfg&#x;h"],
            },
        ]));

    it("legacy entities", () =>
        runTest("&AMPel&iacutee&ampeer;s&lter&sum", {}, [
            {
                event: "text",
                startIndex: 0,
                endIndex: 31,
                data: ["&elíe&eer;s<er&sum"],
            },
        ]));

    it("named entities", () =>
        runTest("&amp;el&lt;er&CounterClockwiseContourIntegral;foo&bar", {}, [
            {
                event: "text",
                startIndex: 0,
                endIndex: 52,
                data: ["&el<er∳foo&bar"],
            },
        ]));

    it("xml entities", () =>
        runTest(
            "&amp;&gt;&amp&lt;&uuml;&#x61;&#x62&#99;&#100&#101",
            { xmlMode: true },
            [
                {
                    event: "text",
                    startIndex: 0,
                    endIndex: 48,
                    data: ["&>&amp<&uuml;a&#x62c&#100&#101"],
                },
            ]
        ));

    it("entity in attribute", () =>
        runTest(
            "<a href='http://example.com/p&#x61;#x61ge?param=value&param2&param3=&lt;val&; & &'>",
            {},
            [
                {
                    event: "opentagname",
                    startIndex: 0,
                    endIndex: 2,
                    data: ["a"],
                },
                {
                    event: "attribute",
                    startIndex: 3,
                    endIndex: 81,
                    data: [
                        "href",
                        "http://example.com/pa#x61ge?param=value&param2&param3=<val&; & &",
                        "'",
                    ],
                },
                {
                    event: "opentag",
                    startIndex: 0,
                    endIndex: 82,
                    data: [
                        "a",
                        {
                            href: "http://example.com/pa#x61ge?param=value&param2&param3=<val&; & &",
                        },
                        false,
                    ],
                },
                {
                    event: "closetag",
                    startIndex: 83,
                    endIndex: 83,
                    data: ["a", true],
                },
            ]
        ));

    it("double brackets", () =>
        runTest("<<princess-purpose>>testing</princess-purpose>", {}, [
            { event: "text", startIndex: 0, endIndex: 0, data: ["<"] },
            {
                event: "opentagname",
                startIndex: 1,
                endIndex: 18,
                data: ["princess-purpose"],
            },
            {
                event: "opentag",
                startIndex: 1,
                endIndex: 18,
                data: ["princess-purpose", {}, false],
            },
            { event: "text", startIndex: 19, endIndex: 26, data: [">testing"] },
            {
                event: "closetag",
                startIndex: 27,
                endIndex: 45,
                data: ["princess-purpose", false],
            },
        ]));

    it("legacy entities fail", () =>
        runTest("M&M", {}, [
            { event: "text", startIndex: 0, endIndex: 2, data: ["M&M"] },
        ]));

    it("Special special tags", () =>
        runTest(
            "<tItLe><b>foo</b><title></TiTlE><sitle><b></b></sitle><ttyle><b></b></ttyle><sCriPT></scripter</soo</sCript><STyLE></styler</STylE><sCiPt><stylee><scriptee><soo>",
            {},
            [
                {
                    event: "opentagname",
                    startIndex: 0,
                    endIndex: 6,
                    data: ["title"],
                },
                {
                    event: "opentag",
                    startIndex: 0,
                    endIndex: 6,
                    data: ["title", {}, false],
                },
                {
                    event: "text",
                    startIndex: 7,
                    endIndex: 23,
                    data: ["<b>foo</b><title>"],
                },
                {
                    event: "closetag",
                    startIndex: 24,
                    endIndex: 31,
                    data: ["title", false],
                },
                {
                    event: "opentagname",
                    startIndex: 32,
                    endIndex: 38,
                    data: ["sitle"],
                },
                {
                    event: "opentag",
                    startIndex: 32,
                    endIndex: 38,
                    data: ["sitle", {}, false],
                },
                {
                    event: "opentagname",
                    startIndex: 39,
                    endIndex: 41,
                    data: ["b"],
                },
                {
                    event: "opentag",
                    startIndex: 39,
                    endIndex: 41,
                    data: ["b", {}, false],
                },
                {
                    event: "closetag",
                    startIndex: 42,
                    endIndex: 45,
                    data: ["b", false],
                },
                {
                    event: "closetag",
                    startIndex: 46,
                    endIndex: 53,
                    data: ["sitle", false],
                },
                {
                    event: "opentagname",
                    startIndex: 54,
                    endIndex: 60,
                    data: ["ttyle"],
                },
                {
                    event: "opentag",
                    startIndex: 54,
                    endIndex: 60,
                    data: ["ttyle", {}, false],
                },
                {
                    event: "opentagname",
                    startIndex: 61,
                    endIndex: 63,
                    data: ["b"],
                },
                {
                    event: "opentag",
                    startIndex: 61,
                    endIndex: 63,
                    data: ["b", {}, false],
                },
                {
                    event: "closetag",
                    startIndex: 64,
                    endIndex: 67,
                    data: ["b", false],
                },
                {
                    event: "closetag",
                    startIndex: 68,
                    endIndex: 75,
                    data: ["ttyle", false],
                },
                {
                    event: "opentagname",
                    startIndex: 76,
                    endIndex: 83,
                    data: ["script"],
                },
                {
                    event: "opentag",
                    startIndex: 76,
                    endIndex: 83,
                    data: ["script", {}, false],
                },
                {
                    event: "text",
                    startIndex: 84,
                    endIndex: 98,
                    data: ["</scripter</soo"],
                },
                {
                    event: "closetag",
                    startIndex: 99,
                    endIndex: 107,
                    data: ["script", false],
                },
                {
                    event: "opentagname",
                    startIndex: 108,
                    endIndex: 114,
                    data: ["style"],
                },
                {
                    event: "opentag",
                    startIndex: 108,
                    endIndex: 114,
                    data: ["style", {}, false],
                },
                {
                    event: "text",
                    startIndex: 115,
                    endIndex: 122,
                    data: ["</styler"],
                },
                {
                    event: "closetag",
                    startIndex: 123,
                    endIndex: 130,
                    data: ["style", false],
                },
                {
                    event: "opentagname",
                    startIndex: 131,
                    endIndex: 137,
                    data: ["scipt"],
                },
                {
                    event: "opentag",
                    startIndex: 131,
                    endIndex: 137,
                    data: ["scipt", {}, false],
                },
                {
                    event: "opentagname",
                    startIndex: 138,
                    endIndex: 145,
                    data: ["stylee"],
                },
                {
                    event: "opentag",
                    startIndex: 138,
                    endIndex: 145,
                    data: ["stylee", {}, false],
                },
                {
                    event: "opentagname",
                    startIndex: 146,
                    endIndex: 155,
                    data: ["scriptee"],
                },
                {
                    event: "opentag",
                    startIndex: 146,
                    endIndex: 155,
                    data: ["scriptee", {}, false],
                },
                {
                    event: "opentagname",
                    startIndex: 156,
                    endIndex: 160,
                    data: ["soo"],
                },
                {
                    event: "opentag",
                    startIndex: 156,
                    endIndex: 160,
                    data: ["soo", {}, false],
                },
                {
                    event: "closetag",
                    startIndex: 161,
                    endIndex: 161,
                    data: ["soo", true],
                },
                {
                    event: "closetag",
                    startIndex: 161,
                    endIndex: 161,
                    data: ["scriptee", true],
                },
                {
                    event: "closetag",
                    startIndex: 161,
                    endIndex: 161,
                    data: ["stylee", true],
                },
                {
                    event: "closetag",
                    startIndex: 161,
                    endIndex: 161,
                    data: ["scipt", true],
                },
            ]
        ));

    it("Empty tag name", () =>
        runTest("< ></ >", {}, [
            { event: "text", startIndex: 0, endIndex: 6, data: ["< ></ >"] },
        ]));

    it("Not quite closed", () =>
        runTest("<foo /bar></foo bar>", {}, [
            { event: "opentagname", startIndex: 0, endIndex: 4, data: ["foo"] },
            {
                event: "attribute",
                startIndex: 6,
                endIndex: 9,
                data: ["bar", ""],
            },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 9,
                data: ["foo", { bar: "" }, false],
            },
            {
                event: "closetag",
                startIndex: 10,
                endIndex: 15,
                data: ["foo", false],
            },
        ]));

    it("Entities in attributes", () =>
        runTest("<foo bar=&amp; baz=\"&amp;\" boo='&amp;' noo=>", {}, [
            { event: "opentagname", startIndex: 0, endIndex: 4, data: ["foo"] },
            {
                event: "attribute",
                startIndex: 5,
                endIndex: 14,
                data: ["bar", "&", null],
            },
            {
                event: "attribute",
                startIndex: 15,
                endIndex: 25,
                data: ["baz", "&", '"'],
            },
            {
                event: "attribute",
                startIndex: 27,
                endIndex: 37,
                data: ["boo", "&", "'"],
            },
            {
                event: "attribute",
                startIndex: 39,
                endIndex: 43,
                data: ["noo", "", null],
            },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 43,
                data: ["foo", { bar: "&", baz: "&", boo: "&", noo: "" }, false],
            },
            {
                event: "closetag",
                startIndex: 44,
                endIndex: 44,
                data: ["foo", true],
            },
        ]));

    it("CDATA in HTML", () =>
        runTest("<![CDATA[ foo ]]>", {}, [
            {
                event: "comment",
                startIndex: 0,
                endIndex: 16,
                data: ["[CDATA[ foo ]]"],
            },
            { event: "commentend", startIndex: 0, endIndex: 16, data: [] },
        ]));

    it("Comment edge-cases", () =>
        runTest("<!-foo><!-- --- --><!--foo", {}, [
            {
                event: "processinginstruction",
                startIndex: 0,
                endIndex: 6,
                data: ["!-foo", "!-foo"],
            },
            { event: "comment", startIndex: 7, endIndex: 18, data: [" --- "] },
            { event: "commentend", startIndex: 7, endIndex: 18, data: [] },
            { event: "comment", startIndex: 19, endIndex: 26, data: ["foo"] },
            { event: "commentend", startIndex: 19, endIndex: 26, data: [] },
        ]));

    it("CDATA edge-cases", () =>
        runTest(
            "<![CDATA><![CDATA[[]]sdaf]]><![CDATA[foo",
            { recognizeCDATA: true },
            [
                {
                    event: "processinginstruction",
                    startIndex: 0,
                    endIndex: 8,
                    data: ["![cdata", "![CDATA"],
                },
                { event: "cdatastart", startIndex: 9, endIndex: 27, data: [] },
                {
                    event: "text",
                    startIndex: 9,
                    endIndex: 27,
                    data: ["[]]sdaf"],
                },
                { event: "cdataend", startIndex: 9, endIndex: 27, data: [] },
                { event: "cdatastart", startIndex: 28, endIndex: 40, data: [] },
                { event: "text", startIndex: 28, endIndex: 40, data: ["foo"] },
                { event: "cdataend", startIndex: 28, endIndex: 40, data: [] },
            ]
        ));

    it("Comment false ending", () =>
        runTest("<!-- a-b-> -->", {}, [
            {
                event: "comment",
                startIndex: 0,
                endIndex: 13,
                data: [" a-b-> "],
            },
            { event: "commentend", startIndex: 0, endIndex: 13, data: [] },
        ]));

    it("Scripts ending with <", () =>
        runTest("<script><</script>", {}, [
            {
                event: "opentagname",
                startIndex: 0,
                endIndex: 7,
                data: ["script"],
            },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 7,
                data: ["script", {}, false],
            },
            { event: "text", startIndex: 8, endIndex: 8, data: ["<"] },
            {
                event: "closetag",
                startIndex: 9,
                endIndex: 17,
                data: ["script", false],
            },
        ]));

    it("CDATA more edge-cases", () =>
        runTest("<![CDATA[foo]bar]>baz]]>", { recognizeCDATA: true }, [
            { event: "cdatastart", startIndex: 0, endIndex: 23, data: [] },
            {
                event: "text",
                startIndex: 0,
                endIndex: 23,
                data: ["foo]bar]>baz"],
            },
            { event: "cdataend", startIndex: 0, endIndex: 23, data: [] },
        ]));

    it("tag names are not ASCII alpha", () =>
        runTest("<12>text</12>", {}, [
            { event: "text", startIndex: 0, endIndex: 7, data: ["<12>text"] },
            { event: "comment", startIndex: 8, endIndex: 12, data: ["12"] },
            { event: "commentend", startIndex: 8, endIndex: 12, data: [] },
        ]));

    it("open-implies-close case of (non-br) void close tag in non-XML mode", () =>
        runTest("<select><input></select>", { lowerCaseAttributeNames: true }, [
            {
                event: "opentagname",
                startIndex: 0,
                endIndex: 7,
                data: ["select"],
            },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 7,
                data: ["select", {}, false],
            },
            {
                event: "closetag",
                startIndex: 8,
                endIndex: 14,
                data: ["select", true],
            },
            {
                event: "opentagname",
                startIndex: 8,
                endIndex: 14,
                data: ["input"],
            },
            {
                event: "opentag",
                startIndex: 8,
                endIndex: 14,
                data: ["input", {}, false],
            },
            {
                event: "closetag",
                startIndex: 8,
                endIndex: 14,
                data: ["input", true],
            },
        ]));

    it("entity in attribute (#276)", () =>
        runTest(
            '<img src="?&image_uri=1&&image;=2&image=3"/>?&image_uri=1&&image;=2&image=3',
            {},
            [
                {
                    event: "opentagname",
                    startIndex: 0,
                    endIndex: 4,
                    data: ["img"],
                },
                {
                    event: "attribute",
                    startIndex: 5,
                    endIndex: 41,
                    data: ["src", "?&image_uri=1&ℑ=2&image=3", '"'],
                },
                {
                    event: "opentag",
                    startIndex: 0,
                    endIndex: 43,
                    data: ["img", { src: "?&image_uri=1&ℑ=2&image=3" }, false],
                },
                {
                    event: "closetag",
                    startIndex: 0,
                    endIndex: 43,
                    data: ["img", true],
                },
                {
                    event: "text",
                    startIndex: 44,
                    endIndex: 74,
                    data: ["?&image_uri=1&ℑ=2&image=3"],
                },
            ]
        ));

    it("entity in title (#592)", () =>
        runTest("<title>the &quot;title&quot", {}, [
            {
                event: "opentagname",
                startIndex: 0,
                endIndex: 6,
                data: ["title"],
            },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 6,
                data: ["title", {}, false],
            },
            {
                event: "text",
                startIndex: 7,
                endIndex: 26,
                data: ['the "title"'],
            },
            {
                event: "closetag",
                startIndex: 27,
                endIndex: 27,
                data: ["title", true],
            },
        ]));

    it("entity in title - decodeEntities=false (#592)", () =>
        runTest("<title>the &quot;title&quot;", { decodeEntities: false }, [
            {
                event: "opentagname",
                startIndex: 0,
                endIndex: 6,
                data: ["title"],
            },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 6,
                data: ["title", {}, false],
            },
            {
                event: "text",
                startIndex: 7,
                endIndex: 27,
                data: ["the &quot;title&quot;"],
            },
            {
                event: "closetag",
                startIndex: 28,
                endIndex: 28,
                data: ["title", true],
            },
        ]));

    it("</title> in <script> (#745)", () =>
        runTest("<script>'</title>'</script>", {}, [
            {
                event: "opentagname",
                startIndex: 0,
                endIndex: 7,
                data: ["script"],
            },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 7,
                data: ["script", {}, false],
            },
            {
                event: "text",
                startIndex: 8,
                endIndex: 17,
                data: ["'</title>'"],
            },
            {
                event: "closetag",
                startIndex: 18,
                endIndex: 26,
                data: ["script", false],
            },
        ]));

    it("XML tags", () =>
        runTest("<:foo><_bar>", { xmlMode: true }, [
            {
                event: "opentagname",
                startIndex: 0,
                endIndex: 5,
                data: [":foo"],
            },
            {
                event: "opentag",
                startIndex: 0,
                endIndex: 5,
                data: [":foo", {}, false],
            },
            {
                event: "opentagname",
                startIndex: 6,
                endIndex: 11,
                data: ["_bar"],
            },
            {
                event: "opentag",
                startIndex: 6,
                endIndex: 11,
                data: ["_bar", {}, false],
            },
            {
                event: "closetag",
                startIndex: 12,
                endIndex: 12,
                data: ["_bar", true],
            },
            {
                event: "closetag",
                startIndex: 12,
                endIndex: 12,
                data: [":foo", true],
            },
        ]));

    it("Trailing legacy entity", () =>
        runTest("&timesbar;&timesbar", {}, [
            { event: "text", startIndex: 0, endIndex: 18, data: ["⨱×bar"] },
        ]));

    it("Trailing numeric entity", () =>
        runTest("&#53&#53", {}, [
            { event: "text", startIndex: 0, endIndex: 7, data: ["55"] },
        ]));

    it("Multi-byte entity", () =>
        runTest("&NotGreaterFullEqual;", {}, [
            { event: "text", startIndex: 0, endIndex: 20, data: ["≧̸"] },
        ]));

    it("Start & end indices from domhandler", () =>
        runTest(
            "<!DOCTYPE html> <html> <title>The Title</title> <body class='foo'>Hello world <p></p></body> <!-- the comment --> </html> ",
            {},
            [
                {
                    event: "processinginstruction",
                    startIndex: 0,
                    endIndex: 14,
                    data: ["!doctype", "!DOCTYPE html"],
                },
                { event: "text", startIndex: 15, endIndex: 15, data: [" "] },
                {
                    event: "opentagname",
                    startIndex: 16,
                    endIndex: 21,
                    data: ["html"],
                },
                {
                    event: "opentag",
                    startIndex: 16,
                    endIndex: 21,
                    data: ["html", {}, false],
                },
                { event: "text", startIndex: 22, endIndex: 22, data: [" "] },
                {
                    event: "opentagname",
                    startIndex: 23,
                    endIndex: 29,
                    data: ["title"],
                },
                {
                    event: "opentag",
                    startIndex: 23,
                    endIndex: 29,
                    data: ["title", {}, false],
                },
                {
                    event: "text",
                    startIndex: 30,
                    endIndex: 38,
                    data: ["The Title"],
                },
                {
                    event: "closetag",
                    startIndex: 39,
                    endIndex: 46,
                    data: ["title", false],
                },
                { event: "text", startIndex: 47, endIndex: 47, data: [" "] },
                {
                    event: "opentagname",
                    startIndex: 48,
                    endIndex: 53,
                    data: ["body"],
                },
                {
                    event: "attribute",
                    startIndex: 54,
                    endIndex: 64,
                    data: ["class", "foo", "'"],
                },
                {
                    event: "opentag",
                    startIndex: 48,
                    endIndex: 65,
                    data: ["body", { class: "foo" }, false],
                },
                {
                    event: "text",
                    startIndex: 66,
                    endIndex: 77,
                    data: ["Hello world "],
                },
                {
                    event: "opentagname",
                    startIndex: 78,
                    endIndex: 80,
                    data: ["p"],
                },
                {
                    event: "opentag",
                    startIndex: 78,
                    endIndex: 80,
                    data: ["p", {}, false],
                },
                {
                    event: "closetag",
                    startIndex: 81,
                    endIndex: 84,
                    data: ["p", false],
                },
                {
                    event: "closetag",
                    startIndex: 85,
                    endIndex: 91,
                    data: ["body", false],
                },
                { event: "text", startIndex: 92, endIndex: 92, data: [" "] },
                {
                    event: "comment",
                    startIndex: 93,
                    endIndex: 112,
                    data: [" the comment "],
                },
                {
                    event: "commentend",
                    startIndex: 93,
                    endIndex: 112,
                    data: [],
                },
                { event: "text", startIndex: 113, endIndex: 113, data: [" "] },
                {
                    event: "closetag",
                    startIndex: 114,
                    endIndex: 120,
                    data: ["html", false],
                },
                { event: "text", startIndex: 121, endIndex: 121, data: [" "] },
            ]
        ));

    it("Self-closing indices (#941)", () =>
        runTest("<xml><a/><b/></xml>", { xmlMode: true }, [
            { event: "opentagname", data: ["xml"], startIndex: 0, endIndex: 4 },
            {
                event: "opentag",
                data: ["xml", {}, false],
                startIndex: 0,
                endIndex: 4,
            },
            { event: "opentagname", data: ["a"], startIndex: 5, endIndex: 7 },
            {
                event: "opentag",
                data: ["a", {}, false],
                startIndex: 5,
                endIndex: 8,
            },
            {
                event: "closetag",
                data: ["a", true],
                startIndex: 5,
                endIndex: 8,
            },
            { event: "opentagname", data: ["b"], startIndex: 9, endIndex: 11 },
            {
                event: "opentag",
                data: ["b", {}, false],
                startIndex: 9,
                endIndex: 12,
            },
            {
                event: "closetag",
                data: ["b", true],
                startIndex: 9,
                endIndex: 12,
            },
            {
                event: "closetag",
                data: ["xml", false],
                startIndex: 13,
                endIndex: 18,
            },
        ]));

    it("Entity after <", () =>
        runTest("<&amp;", {}, [
            { event: "text", startIndex: 0, endIndex: 5, data: ["<&"] },
        ]));

    it("Attribute in XML (see #1350)", () =>
        runTest(
            '<Page\n    title="Hello world"\n    actionBarVisible="false"/>',
            { xmlMode: true },
            [
                {
                    data: ["Page"],
                    endIndex: 5,
                    event: "opentagname",
                    startIndex: 0,
                },
                {
                    data: ["title", "Hello world", '"'],
                    endIndex: 28,
                    event: "attribute",
                    startIndex: 10,
                },
                {
                    data: ["actionBarVisible", "false", '"'],
                    endIndex: 57,
                    event: "attribute",
                    startIndex: 34,
                },
                {
                    data: [
                        "Page",
                        { actionBarVisible: "false", title: "Hello world" },
                        false,
                    ],
                    endIndex: 59,
                    event: "opentag",
                    startIndex: 0,
                },
                {
                    data: ["Page", true],
                    endIndex: 59,
                    event: "closetag",
                    startIndex: 0,
                },
            ]
        ));
});

describe("Helper", () => {
    it("should handle errors", () => {
        const eventCallback = jest.fn();
        const parser = new Parser(helper.getEventCollector(eventCallback));

        parser.end();
        parser.write("foo");

        expect(eventCallback).toHaveBeenCalledTimes(2);
        expect(eventCallback).toHaveBeenNthCalledWith(1, null, []);
        expect(eventCallback).toHaveBeenLastCalledWith(
            new Error(".write() after done!")
        );
    });
});
