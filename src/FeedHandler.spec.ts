// Runs tests for feeds

import * as helper from "./__fixtures__/test-helper.js";
import { DomHandler, getFeed, parseFeed } from "./index.js";
import fs from "node:fs/promises";
import path from "node:path";

const documents = path.join(__dirname, "__fixtures__", "Documents");

async function runTest(file: string): Promise<void> {
    const input = await fs.readFile(path.join(documents, file), "utf8");

    return new Promise((resolve, reject) => {
        let handler: DomHandler;
        let firstResult: unknown;

        helper.writeToParser(
            (handler = new DomHandler((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                const feed = getFeed(handler.dom);
                if (firstResult) {
                    expect(feed).toStrictEqual(firstResult);
                    resolve();
                } else {
                    firstResult = feed;
                    expect(feed).toMatchSnapshot();
                }
            })),
            { xmlMode: true },
            input
        );
    });
}

describe("Feeds", () => {
    it("RSS (2.0)", () => runTest("RSS_Example.xml"));
    it("Atom (1.0)", () => runTest("Atom_Example.xml"));
    it("RDF test", () => runTest("RDF_Example.xml"));
});

describe("parseFeed", () => {
    test("(rssFeed)", async () => {
        const file = path.join(documents, "RSS_Example.xml");
        const rss = await fs.readFile(file, "utf8");
        const feed = parseFeed(rss);

        expect(feed).toMatchSnapshot();
    });
});
