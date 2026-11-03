/**
 * Tests for src/lib/calendar/return-path.ts
 *
 * After connecting Google Calendar, people return to the page they started
 * from. The path comes from a query parameter, so only known in-app pages may
 * pass — never another site (open redirect).
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { connectGoogleHref, safeReturnPath } from "../src/lib/calendar/return-path.js";

describe("safeReturnPath", () => {
  it("accepts the dashboard, a session page and a mentor page", () => {
    assert.equal(safeReturnPath("/dashboard"), "/dashboard");
    assert.equal(safeReturnPath("/session/abc-123"), "/session/abc-123");
    assert.equal(safeReturnPath("/mentor/Xy9_z"), "/mentor/Xy9_z");
  });

  it("refuses other sites, other pages and anything that could become one", () => {
    for (const path of [
      null,
      undefined,
      "",
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/settings",
      "/dashboard/../admin",
      "/dashboard?x=1",
      "/dashboard#x",
      "/session/",
      "/session/a/b",
      "/session/%2F%2Fevil.example",
      "/mentor/a b",
      ` /dashboard`,
      "/dashboard\n",
      `/session/${"a".repeat(65)}`,
    ]) {
      assert.equal(safeReturnPath(path), null, String(path));
    }
  });
});

describe("connectGoogleHref", () => {
  it("adds the page to come back to only when it's accepted", () => {
    assert.equal(connectGoogleHref("/dashboard"), "/api/calendar/connect/google?returnTo=%2Fdashboard");
    assert.equal(connectGoogleHref("https://evil.example"), "/api/calendar/connect/google");
    assert.equal(connectGoogleHref(), "/api/calendar/connect/google");
  });
});
