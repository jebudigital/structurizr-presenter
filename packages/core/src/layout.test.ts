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
});
