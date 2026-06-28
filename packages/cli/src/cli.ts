#!/usr/bin/env node

import { mkdir, readFile, writeFile, copyFile, access } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import {
  buildPresentationFromSources,
  crossValidate,
  extractFromDsl,
  validateSceneFile,
  type IRPayload,
} from "@structurizr-presenter/core";

const require = createRequire(import.meta.url);

const WORKSPACE_DSL = `workspace "Big Bank" "" {
  model {
    customer = person "Personal Banking Customer" "A customer of the bank."
    internetBankingSystem = softwareSystem "Internet Banking System" "Allows customers to view account balances."
    mainframe = softwareSystem "Mainframe Banking System" "Stores account information."

    customer -> internetBankingSystem "Views account balances and makes payments using"
    internetBankingSystem -> mainframe "Gets account information from and makes transactions using"
  }
  views { }
}
`;

const SCENE_YAML = `title: Big Bank Architecture
subtitle: A sample structurizr-presenter deck

scenes:
  - id: context
    title: System Context
    cast: [customer, internetBankingSystem, mainframe]
    steps:
      - title: Overview
        narration: "Three actors in our banking landscape."
        spotlight: "all"
      - title: Customer journey
        narration: "Customers interact with internet banking."
        spotlight: "customer -> internetBankingSystem"
      - title: Backend integration
        narration: "Internet banking talks to the mainframe."
        spotlight: "internetBankingSystem -> mainframe"
        mode: pinpoint
`;

function usage(): void {
  console.log(`structurizr-presenter — presentation-as-code for C4 architectures

Usage:
  structurizr-presenter init
  structurizr-presenter validate -d <workspace.dsl> -s <scenes.yaml>
  structurizr-presenter build   -d <workspace.dsl> -s <scenes.yaml> -o <output-dir>

Options:
  -d    Path to workspace.dsl
  -s    Path to scene YAML file
  -o    Output directory (build only)
`);
}

function parseFlags(args: string[]): Map<string, string> {
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg?.startsWith("-") && args[i + 1] && !args[i + 1]!.startsWith("-")) {
      flags.set(arg.slice(1), args[i + 1]!);
      i++;
    }
  }
  return flags;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function cmdInit(): Promise<number> {
  const cwd = process.cwd();
  const dslPath = path.join(cwd, "workspace.dsl");
  const scenesDir = path.join(cwd, "scenes");
  const scenePath = path.join(scenesDir, "my-talk.yaml");

  if (await fileExists(dslPath)) {
    console.error("error: workspace.dsl already exists");
    return 1;
  }
  if (await fileExists(scenePath)) {
    console.error("error: scenes/my-talk.yaml already exists");
    return 1;
  }

  await mkdir(scenesDir, { recursive: true });
  await writeFile(dslPath, WORKSPACE_DSL, "utf8");
  await writeFile(scenePath, SCENE_YAML, "utf8");

  console.log("Created:");
  console.log("  workspace.dsl");
  console.log("  scenes/my-talk.yaml");
  console.log("");
  console.log("Next:");
  console.log("  structurizr-presenter validate -d workspace.dsl -s scenes/my-talk.yaml");
  console.log("  structurizr-presenter build -d workspace.dsl -s scenes/my-talk.yaml -o dist/my-talk");
  return 0;
}

async function readRequired(flag: Map<string, string>, key: string, label: string): Promise<string | null> {
  const value = flag.get(key);
  if (!value) {
    console.error(`error: missing -${key} (${label})`);
    return null;
  }
  return value;
}

async function cmdValidate(flags: Map<string, string>): Promise<number> {
  const dslPath = await readRequired(flags, "d", "workspace.dsl");
  const scenePath = await readRequired(flags, "s", "scene YAML");
  if (!dslPath || !scenePath) return 1;

  const dslText = await readFile(dslPath, "utf8");
  const sceneYaml = await readFile(scenePath, "utf8");

  const dslResult = extractFromDsl(dslText);
  if (!dslResult.ok) {
    console.error(`DSL error: ${dslResult.error}`);
    return 1;
  }

  const sceneResult = validateSceneFile(sceneYaml);
  if (!sceneResult.ok) {
    for (const err of sceneResult.errors) console.error(err);
    return 1;
  }

  const crossResult = crossValidate(
    sceneResult.data,
    dslResult.elements,
    dslResult.relationships
  );
  if (!crossResult.ok) {
    for (const err of crossResult.errors) console.error(err);
    return 1;
  }

  console.log("OK");
  return 0;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml(ir: IRPayload): string {
  const title = escapeHtml(ir.presentation.title);
  const irJson = JSON.stringify(ir).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="root"></div>
  <script>window.__SP_IR__ = ${irJson};</script>
  <script src="runtime.js"></script>
</body>
</html>
`;
}

function resolveRuntimeDir(): string {
  return path.dirname(require.resolve("@structurizr-presenter/runtime/package.json"));
}

async function cmdBuild(flags: Map<string, string>): Promise<number> {
  const dslPath = await readRequired(flags, "d", "workspace.dsl");
  const scenePath = await readRequired(flags, "s", "scene YAML");
  const outDir = await readRequired(flags, "o", "output directory");
  if (!dslPath || !scenePath || !outDir) return 1;

  const dslText = await readFile(dslPath, "utf8");
  const sceneYaml = await readFile(scenePath, "utf8");

  const result = await buildPresentationFromSources(dslText, sceneYaml);
  if (!result.ok) {
    for (const err of result.errors) console.error(err);
    return 1;
  }

  const runtimeDir = resolveRuntimeDir();
  const runtimeJs = path.join(runtimeDir, "dist", "runtime.js");
  const runtimeCss = path.join(runtimeDir, "dist", "style.css");
  if (!(await fileExists(runtimeJs))) {
    console.error(
      "error: runtime bundle not found — run `pnpm build` in the repo root first"
    );
    return 1;
  }

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "index.html"), renderHtml(result.ir), "utf8");
  await copyFile(runtimeJs, path.join(outDir, "runtime.js"));
  if (await fileExists(runtimeCss)) {
    await copyFile(runtimeCss, path.join(outDir, "style.css"));
  }

  console.log(`Built ${path.resolve(outDir)}`);
  console.log(`Open ${path.join(path.resolve(outDir), "index.html")} in a browser.`);
  return 0;
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === "-h" || cmd === "--help") {
    usage();
    return cmd ? 0 : 1;
  }

  switch (cmd) {
    case "init":
      return cmdInit();
    case "validate":
      return cmdValidate(parseFlags(args.slice(1)));
    case "build":
      return cmdBuild(parseFlags(args.slice(1)));
    default:
      console.error(`error: unknown command "${cmd}"`);
      usage();
      return 1;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
