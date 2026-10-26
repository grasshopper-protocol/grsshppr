import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LocalTime } from "../src/components/local-time.tsx";

const require = createRequire(import.meta.url);
const postcss = require(require.resolve("postcss", { paths: [require.resolve("@tailwindcss/postcss")] }));
const tailwind = require("@tailwindcss/postcss");

describe("calendar locale and touch target regression", () => {
  it("renders LocalTime with the viewer locale's formatted text", () => {
    const original = Date.prototype.toLocaleString;
    let receivedLocale;
    Date.prototype.toLocaleString = function (locale, options) {
      receivedLocale = locale;
      // Use a non-US viewer locale so an en-US hard-code is observable even on
      // machines whose default locale happens to be en-US.
      return original.call(this, locale ?? "en-GB", options);
    };
    try {
      const value = "2026-10-28T16:00:00.000Z";
      const options = { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" };
      const markup = renderToStaticMarkup(React.createElement(LocalTime, { value, options }));
      const expected = original.call(new Date(value), "en-GB", options);
      assert.equal(receivedLocale, undefined, "LocalTime must defer to the viewer locale");
      assert.ok(markup.includes(`>${expected}</time>`), `expected rendered time ${expected}, got ${markup}`);
    } finally {
      Date.prototype.toLocaleString = original;
    }
  });

  it("renders the calendar actions with CSS that guarantees a 44px minimum", async () => {
    const feedSettings = readFileSync(new URL("../src/modules/calendar/feed-settings.tsx", import.meta.url), "utf8");
    const actionBlock = feedSettings.match(/\(feed\.status === "on" \|\| feed\.status === "new"\)[\s\S]*?<\/div>\s*\)}/)?.[0];
    assert.ok(actionBlock, "calendar action group must render");
    const actions = [...actionBlock.matchAll(/<Button[\s\S]*?<\/Button>/g)];
    assert.equal(actions.length, 2, "both calendar actions must render");
    const markup = actions.map(([button], index) => {
      const className = button.match(/className="([^"]*)"/)?.[1] ?? "";
      return { className, markup: renderToStaticMarkup(React.createElement("button", { className, key: index })) };
    });
    const minimumClass = markup[0].className.split(/\s+/).find((name) => name.startsWith("min-h-"));
    assert.ok(minimumClass && markup.every(({ className, markup: button }) => className.includes(minimumClass) && button.includes(minimumClass)),
      "both rendered actions must include the same minimum-height utility");

    const { css } = await postcss([tailwind()]).process('@import "tailwindcss";', { from: fileURLToPath(new URL("../tailwind-regression.css", import.meta.url)) });
    const root = postcss.parse(css);
    const minimumHeight = root.nodes
      .flatMap((node) => node.nodes ?? [])
      .find((node) => node.selector === `.${minimumClass}`)
      ?.nodes.find((declaration) => declaration.prop === "min-height")?.value;
    const spacing = root.nodes
      .flatMap((node) => node.nodes ?? [])
      .flatMap((node) => node.nodes ?? [])
      .find((declaration) => declaration.prop === "--spacing")?.value;
    assert.ok(minimumHeight, "Tailwind must generate the rendered utility's min-height rule");
    assert.ok(spacing, "generated CSS must define Tailwind's spacing variable");
    const computedPixels = minimumHeight.match(/^calc\(var\(--spacing\)\s*\*\s*(\d+)\)$/)
      ? Number(spacing.match(/^([\d.]+)rem$/)?.[1]) * 16 * Number(minimumHeight.match(/\*\s*(\d+)/)[1])
      : Number(minimumHeight.match(/^([\d.]+)px$/)?.[1]);
    assert.ok(computedPixels >= 44, `generated CSS gives the actions a ${computedPixels}px minimum height`);
  });
});
