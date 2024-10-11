// https://bugs.webkit.org/show_bug.cgi?id=265386
const noWidthSpace = "​".repeat(512);
export const visibleBytesForSafari = `<span aria-hidden="true" style=";user-select: none; position:absolute;">${noWidthSpace}</span>`;

export const baseTemplate = html`<!DOCTYPE html>
    <html lang="en">
        <head>
            ${"head"}
        </head>
        <body>
            ${"visibleBytesForSafari"} ${"body"} ${"deferredSlots"} ${"endOfBody"}
        </body>
    </html>`;

function html(templateParts: TemplateStringsArray, ...slots: (keyof TemplateParts)[]) {
    return {
        templateParts,
        slots,
    };
}

export function createSlotTemplate(id: string, htmlStr: string): string {
    let html = String.raw;
    return html`<template data-deferred-template="${id}">${htmlStr}</template>
        <script>
            (function () {
                let t = document.querySelector("[data-deferred-template='${id}']");
                document.querySelector("[data-defferred-slot='${id}']").replaceWith(t.content.cloneNode(true));
                t.remove();
                document.currentScript.remove();
            })();
        </script> `;
}

export type BaseTemplate = ReturnType<typeof html>;

export interface TemplateParts {
    head: unknown;
    body: unknown;
    visibleBytesForSafari: unknown;
    deferredSlots: unknown;
    endOfBody: unknown;
}
