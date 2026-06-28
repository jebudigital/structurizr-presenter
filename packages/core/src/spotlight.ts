export interface SpotlightEdge {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface Highlight {
  components: string[];
  edges: string[];
}

export type SpotlightResult =
  | { ok: true; highlight: Highlight }
  | { ok: false; error: string };

export function parseSpotlight(
  expr: string,
  cast: readonly string[],
  edges: readonly SpotlightEdge[]
): SpotlightResult {
  const trimmed = expr.trim();
  if (!trimmed) return { ok: false, error: "spotlight expression is empty" };

  if (trimmed === "all") {
    const castSet = new Set(cast);
    return {
      ok: true,
      highlight: {
        components: [...cast],
        edges: edges
          .filter((e) => castSet.has(e.sourceId) && castSet.has(e.targetId))
          .map((e) => e.id),
      },
    };
  }

  const arrowIdx = indexOfArrow(trimmed);
  if (arrowIdx === -1) {
    const sideRes = parseSide(trimmed);
    if (!sideRes.ok) return sideRes;
    const missing = sideRes.ids.find((id) => !cast.includes(id));
    if (missing) return { ok: false, error: `id "${missing}" is not in cast` };
    return { ok: true, highlight: { components: sideRes.ids, edges: [] } };
  }

  const lhsRaw = trimmed.slice(0, arrowIdx).trim();
  const rhsRaw = trimmed.slice(arrowIdx + 2).trim();
  if (!lhsRaw) return { ok: false, error: "missing left-hand side of '->'" };
  if (!rhsRaw) return { ok: false, error: "missing right-hand side of '->'" };

  const lhs = parseSide(lhsRaw);
  if (!lhs.ok) return lhs;
  const rhs = parseSide(rhsRaw);
  if (!rhs.ok) return rhs;

  for (const id of [...lhs.ids, ...rhs.ids]) {
    if (!cast.includes(id)) return { ok: false, error: `id "${id}" is not in cast` };
  }

  const lhsSet = new Set(lhs.ids);
  const rhsSet = new Set(rhs.ids);
  const matchedEdges = edges.filter(
    (e) => lhsSet.has(e.sourceId) && rhsSet.has(e.targetId)
  );

  return {
    ok: true,
    highlight: {
      components: [...new Set([...lhs.ids, ...rhs.ids])],
      edges: matchedEdges.map((e) => e.id),
    },
  };
}

function indexOfArrow(s: string): number {
  let depth = 0;
  for (let i = 0; i < s.length - 1; i++) {
    const ch = s[i]!;
    if (ch === "[") depth++;
    else if (ch === "]") depth--;
    else if (depth === 0 && ch === "-" && s[i + 1] === ">") return i;
  }
  return -1;
}

type SideResult = { ok: true; ids: string[] } | { ok: false; error: string };

function parseSide(input: string): SideResult {
  const s = input.trim();
  if (!s) return { ok: false, error: "empty side" };
  if (s.startsWith("[")) {
    if (!s.endsWith("]")) return { ok: false, error: "missing closing ']'" };
    const inner = s.slice(1, -1).trim();
    if (!inner) return { ok: false, error: "empty id list" };
    const parts = inner.split(",").map((p) => p.trim());
    for (const p of parts) {
      if (!isId(p)) return { ok: false, error: `"${p}" is not a valid id` };
    }
    return { ok: true, ids: parts };
  }
  if (!isId(s)) return { ok: false, error: `"${s}" is not a valid id` };
  return { ok: true, ids: [s] };
}

function isId(s: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(s);
}
