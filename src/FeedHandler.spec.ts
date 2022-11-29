// Runs tests for feeds

import * as helper from "./__fixtures__/test-helper.js";
import { DomHandler, getFeed, parseFeed } from "./index.js";
import fs from "node:fs";
import path from "node:path";

const documents = path.join(__dirname, "__fixtures__", "Documents");

helper.createSuite("Feeds", (test, callback) => {
    const file = fs.readFileSync(path.join(documents, test.file), "utf8");
    const handler: DomHandler = new DomHandler((error) =>
        callback(error, getFeed(handler.dom))
    );

    helper.writeToParser(handler, { xmlMode: true }, file);
});

describe("parseFeed", () => {
    test("(rssFeed)", async () => {
        const file = path.join(documents, "RSS_Example.xml");
        const rss = await fs.promises.readFile(file, "utf8");
        const feed = parseFeed(rss);

        expect(feed).toMatchSnapshot();
    });
});
