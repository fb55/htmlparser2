import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { parseFeed } from "./index.js";

const documents = new URL("__fixtures__/Documents/", import.meta.url);

describe("parseFeed", () => {
    for (const [name, file] of [
        ["rssFeed", "RSS_Example.xml"],
        ["atomFeed", "Atom_Example.xml"],
        ["rdfFeed", "RDF_Example.xml"],
    ]) {
        it(`(${name})`, async () => {
            const content = await fs.readFile(new URL(file, documents), "utf8");
            expect(parseFeed(content)).toMatchSnapshot();
        });
    }
});
