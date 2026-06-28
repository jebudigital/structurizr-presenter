import { describe, it, expect } from "vitest";
import { parseSpotlight } from "./spotlight.js";

const cast = ["a", "b", "c", "d"];
const edges = [
  { id: "a->b", sourceId: "a", targetId: "b" },
  { id: "a->c", sourceId: "a", targetId: "c" },
  { id: "b->c", sourceId: "b", targetId: "c" },
  { id: "d->a", sourceId: "d", targetId: "a" },
];

describe("parseSpotlight", () => {
  it('handles "all"', () => {
    const r = parseSpotlight("all", cast, edges);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.highlight.components.sort()).toEqual(["a", "b", "c", "d"]);
      expect(r.highlight.edges.sort()).toEqual(["a->b", "a->c", "b->c", "d->a"]);
    }
  });

  it("handles single id", () => {
    const r = parseSpotlight("a", cast, edges);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.highlight.components).toEqual(["a"]);
      expect(r.highlight.edges).toEqual([]);
    }
  });

  it("handles A -> B", () => {
    const r = parseSpotlight("a -> b", cast, edges);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.highlight.components.sort()).toEqual(["a", "b"]);
      expect(r.highlight.edges).toEqual(["a->b"]);
    }
  });

  it("handles A -> [B, C]", () => {
    const r = parseSpotlight("a -> [b, c]", cast, edges);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.highlight.components.sort()).toEqual(["a", "b", "c"]);
      expect(r.highlight.edges.sort()).toEqual(["a->b", "a->c"]);
    }
  });

  it("handles [A, B] -> C", () => {
    const r = parseSpotlight("[a, b] -> c", cast, edges);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.highlight.components.sort()).toEqual(["a", "b", "c"]);
      expect(r.highlight.edges.sort()).toEqual(["a->c", "b->c"]);
    }
  });

  it("rejects unknown id with a clear error", () => {
    const r = parseSpotlight("a -> z", cast, edges);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/z/);
      expect(r.error).toMatch(/not in cast/i);
    }
  });

  it("rejects malformed expressions", () => {
    expect(parseSpotlight("a ->", cast, edges).ok).toBe(false);
    expect(parseSpotlight("-> b", cast, edges).ok).toBe(false);
    expect(parseSpotlight("[a, b", cast, edges).ok).toBe(false);
    expect(parseSpotlight("", cast, edges).ok).toBe(false);
  });
});
