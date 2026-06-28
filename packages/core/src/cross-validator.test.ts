import { describe, it, expect } from "vitest";
import { crossValidate } from "./cross-validator.js";
import type { SceneFile } from "./validator.js";
import type { DslElement, DslRelationship } from "./dsl-resolver.js";

const elements: DslElement[] = [
  { id: "customer", kind: "person", name: "Customer" },
  { id: "internetBankingSystem", kind: "softwareSystem", name: "IBS" },
  { id: "mainframe", kind: "softwareSystem", name: "Mainframe" },
];
const rels: DslRelationship[] = [
  { sourceId: "customer", targetId: "internetBankingSystem" },
  { sourceId: "internetBankingSystem", targetId: "mainframe" },
];

function scene(cast: string[], spotlights: string[]): SceneFile {
  return {
    title: "T",
    scenes: [
      {
        id: "s1",
        title: "S",
        cast,
        steps: spotlights.map((s) => ({ spotlight: s })),
      },
    ],
  };
}

describe("crossValidate", () => {
  it("passes when cast + spotlights are all known", () => {
    const r = crossValidate(
      scene(["customer", "internetBankingSystem"], ["customer -> internetBankingSystem"]),
      elements,
      rels
    );
    expect(r.ok).toBe(true);
  });

  it("flags unknown cast id with a did-you-mean suggestion", () => {
    const r = crossValidate(scene(["custmer"], ["custmer"]), elements, rels);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.join(" ")).toMatch(/custmer/);
      expect(r.errors.join(" ")).toMatch(/customer/);
    }
  });

  it("flags spotlight referencing id not in cast", () => {
    const r = crossValidate(scene(["customer"], ["mainframe"]), elements, rels);
    expect(r.ok).toBe(false);
  });

  it("flags spotlight with bad expression syntax", () => {
    const r = crossValidate(scene(["customer"], ["customer ->"]), elements, rels);
    expect(r.ok).toBe(false);
  });
});
