import { describe, it, expect } from "vitest";
import { buildPresentationFromSources } from "./build.js";

const dsl = `
workspace "Big Bank" "" {
  model {
    customer = person "Personal Banking Customer"
    internetBankingSystem = softwareSystem "Internet Banking System"
    mainframe = softwareSystem "Mainframe Banking System"

    customer -> internetBankingSystem "Views account balances"
    internetBankingSystem -> mainframe "Gets account info from"
  }
  views { }
}
`;

const sceneYaml = `
title: Big Bank Architecture
scenes:
  - id: context
    title: System Context
    cast: [customer, internetBankingSystem, mainframe]
    steps:
      - spotlight: "all"
      - spotlight: "customer -> internetBankingSystem"
        narration: "Customers view balances online."
`;

describe("buildPresentationFromSources", () => {
  it("produces a self-contained IR payload", async () => {
    const r = await buildPresentationFromSources(dsl, sceneYaml);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.ir.version).toBe(1);
    expect(r.ir.presentation.title).toBe("Big Bank Architecture");
    expect(r.ir.presentation.components).toHaveLength(3);
    expect(r.ir.presentation.scenes).toHaveLength(1);
    expect(r.ir.presentation.scenes[0]!.steps).toHaveLength(2);
    expect(r.ir.presentation.scenes[0]!.steps[1]!.narration).toBe(
      "Customers view balances online."
    );
  });

  it("returns DSL errors", async () => {
    const r = await buildPresentationFromSources(`workspace "x" "" { views { } }`, sceneYaml);
    expect(r.ok).toBe(false);
  });

  it("returns scene validation errors", async () => {
    const r = await buildPresentationFromSources(dsl, "title: [unclosed");
    expect(r.ok).toBe(false);
  });
});
