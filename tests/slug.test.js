/**
 * Tests for src/lib/slug.ts
 *
 * Slugs are the public URL of every profile, so they must be stable, safe, and
 * collision-free. These cover the transform rules and the candidate-picking
 * loop that backs uniqueSlug() in core/profiles/queries.ts.
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { slugify, nextAvailableSlug } from "../src/lib/slug.js";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    assert.equal(slugify("Ada Lovelace"), "ada-lovelace");
  });

  it("strips diacritics", () => {
    assert.equal(slugify("Renée Solà"), "renee-sola");
    assert.equal(slugify("José Núñez"), "jose-nunez");
  });

  it("collapses runs of non-alphanumerics into a single hyphen", () => {
    assert.equal(slugify("Anna   B. — C"), "anna-b-c");
  });

  it("trims leading and trailing hyphens", () => {
    assert.equal(slugify("  !Hello!  "), "hello");
    assert.equal(slugify("---edge---"), "edge");
  });

  it("keeps digits", () => {
    assert.equal(slugify("Web3 Dev 2026"), "web3-dev-2026");
  });

  it("returns an empty string when nothing survives", () => {
    assert.equal(slugify("!!!"), "");
  });
});

describe("nextAvailableSlug", () => {
  it("returns the base when it is free", () => {
    assert.equal(nextAvailableSlug("ada", new Set()), "ada");
  });

  it("appends -2 when the base is taken", () => {
    assert.equal(nextAvailableSlug("ada", new Set(["ada"])), "ada-2");
  });

  it("skips consecutive taken candidates", () => {
    const taken = new Set(["ada", "ada-2", "ada-3"]);
    assert.equal(nextAvailableSlug("ada", taken), "ada-4");
  });

  it("fills the first gap in a non-contiguous taken set", () => {
    // base and -2 taken, -3 free → picks -3
    const taken = new Set(["ada", "ada-2", "ada-4"]);
    assert.equal(nextAvailableSlug("ada", taken), "ada-3");
  });
});
