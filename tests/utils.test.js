import { test } from "node:test";
import assert from "node:assert";
import { cn } from "../src/lib/utils.ts";

test("cn merges class names", () => {
  assert.strictEqual(cn("foo", "bar"), "foo bar");
});

test("cn handles conditional classes", () => {
  assert.strictEqual(cn("foo", false && "bar", "baz"), "foo baz");
});

test("cn merges Tailwind classes correctly", () => {
  assert.strictEqual(cn("px-2 py-1", "px-4"), "py-1 px-4");
});

test("cn supports object-based conditional classes", () => {
  assert.strictEqual(cn({ active: true, disabled: false }), "active");
});

test("cn supports arrays of class names", () => {
  assert.strictEqual(cn(["foo", ["bar"]]), "foo bar");
});

test("cn ignores empty and falsy inputs", () => {
  assert.strictEqual(cn("", null, undefined, false, "foo"), "foo");
});
