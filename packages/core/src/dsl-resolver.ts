import type { ComponentKind } from "./ir.js";

export interface DslElement {
  id: string;
  kind: ComponentKind;
  name: string;
  description?: string;
}

export interface DslRelationship {
  sourceId: string;
  targetId: string;
  label?: string;
}

export type DslExtractionResult =
  | { ok: true; elements: DslElement[]; relationships: DslRelationship[] }
  | { ok: false; error: string };

export function extractFromDsl(text: string): DslExtractionResult {
  const modelBody = sliceBlock(text, "model");
  if (modelBody === null) return { ok: false, error: 'no "model" block found' };

  const elements: DslElement[] = [];
  const relationships: DslRelationship[] = [];

  const flat = stripNestedBlocks(modelBody);

  const lines = flat.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;

    const elMatch = line.match(
      /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(person|softwareSystem|container|component)\s+"([^"]*)"(?:\s+"([^"]*)")?/
    );
    if (elMatch) {
      const [, id, kind, name, description] = elMatch;
      const el: DslElement = {
        id: id!,
        kind: kind as ComponentKind,
        name: name!,
      };
      if (description) el.description = description;
      elements.push(el);
      continue;
    }

    const relMatch = line.match(
      /^([A-Za-z_][A-Za-z0-9_]*)\s*->\s*([A-Za-z_][A-Za-z0-9_]*)(?:\s+"([^"]*)")?/
    );
    if (relMatch) {
      const [, sourceId, targetId, label] = relMatch;
      const rel: DslRelationship = { sourceId: sourceId!, targetId: targetId! };
      if (label) rel.label = label;
      relationships.push(rel);
    }
  }

  return { ok: true, elements, relationships };
}

function sliceBlock(text: string, keyword: string): string | null {
  const re = new RegExp(`\\b${keyword}\\b\\s*\\{`, "g");
  const m = re.exec(text);
  if (!m) return null;
  const start = m.index + m[0].length;
  let depth = 1;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i);
    }
  }
  return null;
}

function stripNestedBlocks(text: string): string {
  let out = "";
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      depth++;
      continue;
    }
    if (ch === "}") {
      depth = Math.max(0, depth - 1);
      out += "\n";
      continue;
    }
    if (depth === 0) out += ch;
  }
  return out;
}
