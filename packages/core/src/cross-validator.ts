import type { SceneFile } from "./validator.js";
import type { DslElement, DslRelationship } from "./dsl-resolver.js";
import { parseSpotlight, type SpotlightEdge } from "./spotlight.js";

export type CrossValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export function crossValidate(
  scenes: SceneFile,
  elements: readonly DslElement[],
  relationships: readonly DslRelationship[]
): CrossValidationResult {
  const errors: string[] = [];
  const elementIds = elements.map((e) => e.id);
  const elementIdSet = new Set(elementIds);

  const edges: SpotlightEdge[] = relationships.map((r) => ({
    id: `${r.sourceId}->${r.targetId}`,
    sourceId: r.sourceId,
    targetId: r.targetId,
  }));

  for (const scene of scenes.scenes) {
    for (const id of scene.cast) {
      if (!elementIdSet.has(id)) {
        const suggestion = didYouMean(id, elementIds);
        errors.push(
          `scene "${scene.id}": cast id "${id}" not found in DSL` +
            (suggestion ? ` — did you mean "${suggestion}"?` : "")
        );
      }
    }

    const castIds = scene.cast.filter((id) => elementIdSet.has(id));
    scene.steps.forEach((step, i) => {
      const r = parseSpotlight(step.spotlight, castIds, edges);
      if (!r.ok) {
        errors.push(
          `scene "${scene.id}" step ${i + 1}: spotlight "${step.spotlight}" — ${r.error}`
        );
      }
    });
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function didYouMean(input: string, candidates: readonly string[]): string | undefined {
  let best: string | undefined;
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = levenshtein(input, c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return bestDist <= 2 ? best : undefined;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]!;
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j]!, dp[j - 1]!);
      prev = tmp;
    }
  }
  return dp[n]!;
}
