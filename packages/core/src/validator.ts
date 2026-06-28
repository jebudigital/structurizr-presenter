import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import { parse as parseYaml } from "yaml";
import { sceneSchema } from "./schema.js";

export interface SceneFile {
  title: string;
  subtitle?: string;
  defaults?: { mode?: "trailing" | "sticky" | "pinpoint" };
  scenes: SceneFileScene[];
}

export interface SceneFileScene {
  id: string;
  title: string;
  cast: string[];
  steps: SceneFileStep[];
}

export interface SceneFileStep {
  title?: string;
  narration?: string;
  spotlight: string;
  mode?: "trailing" | "sticky" | "pinpoint";
}

export type ValidationResult =
  | { ok: true; data: SceneFile }
  | { ok: false; errors: string[] };

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile<SceneFile>(sceneSchema);

export function validateSceneFile(yamlText: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = parseYaml(yamlText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, errors: [`YAML parse error: ${msg}`] };
  }

  if (validate(parsed)) {
    return { ok: true, data: parsed as SceneFile };
  }
  return { ok: false, errors: (validate.errors ?? []).map(formatError) };
}

function formatError(err: ErrorObject): string {
  const path = err.instancePath || "(root)";
  return `${path}: ${err.message ?? "invalid"}`;
}
