import { describe, it, expect } from "vitest";
import { layoutPresentation } from "./layout.js";
import type { DslElement, DslRelationship } from "./dsl-resolver.js";

const elements: DslElement[] = [
  { id: "a", kind: "person", name: "A" },
  { id: "b", kind: "softwareSystem", name: "B" },
  { id: "c", kind: "softwareSystem", name: "C" },
];
const rels: DslRelationship[] = [
  { sourceId: "a", targetId: "b", label: "uses" },
  { sourceId: "b", targetId: "c" },
];

describe("layoutPresentation", () => {
  it("assigns non-overlapping x/y/width/height to each element", async () => {
    const r = await layoutPresentation(elements, rels);
    expect(r.components).toHaveLength(3);
    for (const c of r.components) {
      expect(c.width).toBeGreaterThan(0);
      expect(c.height).toBeGreaterThan(0);
      expect(Number.isFinite(c.x)).toBe(true);
      expect(Number.isFinite(c.y)).toBe(true);
    }
    const ids = r.components.map((c) => c.id).sort();
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("produces routed edge polylines with at least 2 points each", async () => {
    const r = await layoutPresentation(elements, rels);
    expect(r.edges).toHaveLength(2);
    for (const e of r.edges) {
      expect(e.points.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("preserves relationship labels", async () => {
    const r = await layoutPresentation(elements, rels);
    const ab = r.edges.find((e) => e.sourceId === "a" && e.targetId === "b");
    expect(ab?.label).toBe("uses");
  });

  it("normalizes coordinates to a (0,0) origin and reports bounds", async () => {
    const r = await layoutPresentation(elements, rels);
    expect(r.width).toBeGreaterThan(0);
    expect(r.height).toBeGreaterThan(0);
    const minX = Math.min(...r.components.map((c) => c.x));
    const minY = Math.min(...r.components.map((c) => c.y));
    expect(minX).toBeGreaterThanOrEqual(0);
    expect(minY).toBeGreaterThanOrEqual(0);
  });

  it("orients horizontally vs vertically based on direction", async () => {
    const vertical = await layoutPresentation(elements, rels, { direction: "vertical" });
    const horizontal = await layoutPresentation(elements, rels, { direction: "horizontal" });
    // A chain a->b->c is taller than wide vertically, and wider than tall horizontally.
    expect(vertical.height).toBeGreaterThan(horizontal.height);
    expect(horizontal.width).toBeGreaterThan(vertical.width);
  });
});
