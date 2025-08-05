// https://bugs.webkit.org/show_bug.cgi?id=265386
const noWidthSpace = "​".repeat(512);
export const visibleBytesForSafari = `<span aria-hidden="true" style=";user-select: none; position:absolute;">${noWidthSpace}</span>`;

export const baseTemplate: BaseTemplate = html`<!DOCTYPE html>
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


export function parseTemplateString(template: string) : BaseTemplate {
    const slots: (keyof TemplateParts)[] = [];
    const templateParts: string[] = [];

    const regex = /\{\{([^}]+)\}\}/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(template)) !== null) {
        templateParts.push(template.slice(lastIndex, match.index));
        slots.push(match[1] as keyof TemplateParts);
        lastIndex = regex.lastIndex;
    }

    templateParts.push(template.slice(lastIndex));

    return {
        templateParts,
        slots,
    };
}

export interface BaseTemplate {
    templateParts: readonly string[];
    slots: readonly (keyof TemplateParts)[];
}

export interface TemplateParts {
    head: unknown;
    body: unknown;
    visibleBytesForSafari: unknown;
    deferredSlots: unknown;
    endOfBody: unknown;
}
