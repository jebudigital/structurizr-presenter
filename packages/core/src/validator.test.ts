import { describe, it, expect } from "vitest";
import { validateSceneFile } from "./validator.js";

describe("validateSceneFile", () => {
  it("accepts a minimal valid scene file", () => {
    const yaml = `
title: Test
scenes:
  - id: s1
    title: Scene 1
    cast: [a, b]
    steps:
      - spotlight: "a -> b"
`;
    const result = validateSceneFile(yaml);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.title).toBe("Test");
      expect(result.data.scenes).toHaveLength(1);
    }
  });

  it("rejects missing required title", () => {
    const yaml = `
scenes:
  - id: s1
    title: Scene 1
    cast: [a]
    steps:
      - spotlight: "a"
`;
    const result = validateSceneFile(yaml);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toMatch(/title/i);
    }
  });

  it("rejects empty cast", () => {
    const yaml = `
title: T
scenes:
  - id: s1
    title: S
    cast: []
    steps:
      - spotlight: "a"
`;
    const result = validateSceneFile(yaml);
    expect(result.ok).toBe(false);
  });

  it("rejects invalid mode enum", () => {
    const yaml = `
title: T
scenes:
  - id: s1
    title: S
    cast: [a]
    steps:
      - spotlight: "a"
        mode: bogus
`;
    const result = validateSceneFile(yaml);
    expect(result.ok).toBe(false);
  });

  it("returns a parse error for malformed YAML", () => {
    const result = validateSceneFile("title: [unclosed");
    expect(result.ok).toBe(false);
  });
});
