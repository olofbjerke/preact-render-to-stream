import test, { describe } from "node:test";
import assert from "node:assert";
import { parseTemplateString } from "./template.js";

describe("Templating", () => {
    test("Extracts the correct format from the template string.", async (t) => {
        const template = "Hello {{name}}! Today is {{day}}.";

        let parts = parseTemplateString(template);
        assert.deepEqual(parts.templateParts, ["Hello ", "! Today is ", "."]);
        assert.deepEqual(parts.slots, ["name", "day"]);
    });
    
    test("Extracts the correct format from the template string.", async (t) => {
        const template = `<html>
<head>{{head}}</head>
<body>{{safari}}{{body}}{{deferredSlots}}{{endOfBody}}</body>
</html>`;

        let parts = parseTemplateString(template);
        assert.deepEqual(parts.templateParts, [
            "<html>\n<head>",
            "</head>\n<body>",
            "",
            "",
            "",
            "</body>\n</html>",
        ]);
        assert.deepEqual(parts.slots, ["head", "safari", "body", "deferredSlots", "endOfBody"]);
    });
});
