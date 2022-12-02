// Runs tests for feeds

import { parseFeed } from "./index.js";
import fs from "node:fs/promises";
import path from "node:path";

const documents = path.join(__dirname, "__fixtures__", "Documents");

describe("parseFeed", () => {
    it("(rssFeed)", async () =>
        expect(
            parseFeed(
                await fs.readFile(
                    path.join(documents, "RSS_Example.xml"),
                    "utf8"
                )
            )
        ).toMatchSnapshot());

    it("(atomFeed)", async () =>
        expect(
            parseFeed(
                await fs.readFile(
                    path.join(documents, "Atom_Example.xml"),
                    "utf8"
                )
            )
        ).toMatchSnapshot());

    it("(rdfFeed)", async () =>
        expect(
            parseFeed(
                await fs.readFile(
                    path.join(documents, "RDF_Example.xml"),
                    "utf8"
                )
            )
        ).toMatchSnapshot());
});
