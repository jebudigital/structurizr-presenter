import { describe, it, expect } from "vitest";
import { extractFromDsl } from "./dsl-resolver.js";

const sample = `
workspace "Big Bank" "" {
  model {
    customer = person "Personal Banking Customer" "A customer."
    internetBankingSystem = softwareSystem "Internet Banking System" "Online banking."
    mainframe = softwareSystem "Mainframe Banking System" "Stores customer accounts."
    email = softwareSystem "E-mail System" "Sends e-mails."

    customer -> internetBankingSystem "Views account balances"
    internetBankingSystem -> mainframe "Gets account info from"
    internetBankingSystem -> email "Sends e-mail using"
    email -> customer "Sends e-mails to"
  }
  views { }
}
`;

describe("extractFromDsl", () => {
  it("extracts persons and softwareSystems with ids", () => {
    const r = extractFromDsl(sample);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ids = r.elements.map((e) => e.id).sort();
    expect(ids).toEqual(["customer", "email", "internetBankingSystem", "mainframe"]);
    const customer = r.elements.find((e) => e.id === "customer");
    expect(customer?.kind).toBe("person");
    expect(customer?.name).toBe("Personal Banking Customer");
    const ibs = r.elements.find((e) => e.id === "internetBankingSystem");
    expect(ibs?.kind).toBe("softwareSystem");
  });

  it("extracts relationships with labels", () => {
    const r = extractFromDsl(sample);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const rel = r.relationships.find(
      (x) => x.sourceId === "customer" && x.targetId === "internetBankingSystem"
    );
    expect(rel?.label).toBe("Views account balances");
    expect(r.relationships).toHaveLength(4);
  });

  it("ignores views block", () => {
    const r = extractFromDsl(sample);
    expect(r.ok).toBe(true);
  });

  it("returns an error if no model block found", () => {
    const r = extractFromDsl(`workspace "x" "" { views { } }`);
    expect(r.ok).toBe(false);
  });
});
