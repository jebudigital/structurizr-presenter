import AjvImport, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormatsImport from "ajv-formats";
import { parse as parseYaml } from "yaml";
import { sceneSchema } from "./schema.js";

export interface ComponentOverride {
  description?: string;
}

export interface SceneFile {
  title: string;
  subtitle?: string;
  defaults?: {
    mode?: "trailing" | "sticky" | "pinpoint";
    direction?: "horizontal" | "vertical";
  };
  /** Per-component overrides keyed by DSL id. Currently supports `description`. */
  components?: Record<string, ComponentOverride>;
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

type AjvInstance = {
  compile<T>(schema: object): ValidateFunction<T>;
};

const Ajv = AjvImport as unknown as new (opts?: object) => AjvInstance;
const addFormats = addFormatsImport as unknown as (ajv: AjvInstance) => void;

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
