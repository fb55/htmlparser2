// Runs tests for feeds

import * as helper from "./__fixtures__/test-helper.js";
import { DomHandler, getFeed, parseFeed } from "./index.js";
import fs from "node:fs";
import path from "node:path";

const documents = path.join(__dirname, "__fixtures__", "Documents");

async function runTest(file: string): Promise<void> {
    const filePath = path.join(documents, file);
    const input = fs.readFileSync(filePath, "utf8");

    let firstResult: unknown;
    let handler: DomHandler | undefined;

    const domPromise = new Promise<void>((resolve, reject) => {
        handler = new DomHandler((error) => {
            if (error) {
                reject(error);
                return;
            }
            const feed = getFeed(handler!.dom);
            if (firstResult) {
                expect(feed).toStrictEqual(firstResult);
                resolve();
            } else {
                firstResult = feed;
                expect(feed).toMatchSnapshot();
            }
        });
    });

    helper.writeToParser(handler!, { xmlMode: true }, input);

    return domPromise;
}

describe("Feeds", () => {
    it("RSS (2.0)", () => runTest("RSS_Example.xml"));
    it("Atom (1.0)", () => runTest("Atom_Example.xml"));
    it("RDF test", () => runTest("RDF_Example.xml"));
});

describe("parseFeed", () => {
    test("(rssFeed)", async () => {
        const file = path.join(documents, "RSS_Example.xml");
        const rss = await fs.promises.readFile(file, "utf8");
        const feed = parseFeed(rss);

        expect(feed).toMatchSnapshot();
    });
});
