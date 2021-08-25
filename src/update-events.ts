import { Parser } from "./Parser";
import { promises as fs } from "fs";
import * as helper from "./__fixtures__/test-helper";

async function run() {
    const eventFiles = await fs.readdir(
        `${__dirname}/../src/__fixtures__/Events`
    );

    for (const filename of eventFiles) {
        const filePath = `${__dirname}/../src/__fixtures__/Events/${filename}`;
        const file = require(filePath);

        let finalEvents: any[] = [];
        const handler = helper.getEventCollector(
            (_, events) => (finalEvents = events!)
        );

        const parser = new Parser(handler, file.options?.parser);
        parser.end(file.input);

        const out = {
            name: file.name,
            input: file.input,
            ...file,
            expected: finalEvents,
        };

        await fs.writeFile(filePath, JSON.stringify(out, null, 2));
    }
}

run().catch(console.error);
