import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LocalTime } from "../src/components/local-time.tsx";
import { CalendarFeedActions } from "../src/modules/calendar/feed-actions.tsx";

describe("calendar locale and touch target regression", () => {
  it("renders the LocalTime placeholder in en-US UTC, whatever the viewer's locale", () => {
    const original = Date.prototype.toLocaleString;
    let receivedLocale;
    Date.prototype.toLocaleString = function (locale, options) {
      receivedLocale = locale;
      return original.call(this, locale ?? "en-GB", options);
    };
    try {
      const value = "2026-10-28T16:00:00.000Z";
      const options = { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" };
      const markup = renderToStaticMarkup(React.createElement(LocalTime, { value, options }));
      const expected = original.call(new Date(value), "en-US", options);
      assert.equal(receivedLocale, "en-US", "the server placeholder must not depend on the viewer's locale");
      assert.ok(markup.includes(`>${expected}</time>`), `expected placeholder ${expected}, got ${markup}`);
    } finally {
      Date.prototype.toLocaleString = original;
    }
  });

  it("gives both calendar actions the min-h-11 class (44px)", () => {
    const markup = renderToStaticMarkup(
      React.createElement(CalendarFeedActions, { busy: false, onMakeNew() {}, onTurnOff() {} }),
    );
    const buttons = markup.match(/<button\b[^>]*>/g) ?? [];
    assert.equal(buttons.length, 2, "both calendar actions must render");
    for (const button of buttons) {
      assert.match(button, /class="[^"]*\bmin-h-11\b[^"]*"/, `expected min-h-11 on ${button}`);
    }
  });
});
