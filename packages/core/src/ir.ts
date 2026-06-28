/**
 * Intermediate Representation produced by the core package and consumed by the runtime.
 * One IR per `build` invocation. Self-contained and JSON-serializable.
 */

export type ComponentKind = "person" | "softwareSystem" | "container" | "component";

export interface ComponentNode {
  id: string;
  name: string;
  description?: string;
  kind: ComponentKind;
  tags?: string[];
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RelationshipEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  points: Array<{ x: number; y: number }>;
}

export type SpotlightMode = "trailing" | "sticky" | "pinpoint";

export interface SceneStep {
  index: number;
  title?: string;
  narration?: string;
  highlight: {
    components: string[];
    edges: string[];
  };
  mode: SpotlightMode;
}

export interface Scene {
  id: string;
  title: string;
  cast: string[];
  steps: SceneStep[];
}

export interface Presentation {
  title: string;
  subtitle?: string;
  components: ComponentNode[];
  edges: RelationshipEdge[];
  scenes: Scene[];
}

export const IR_VERSION = 1 as const;

export interface IRPayload {
  version: typeof IR_VERSION;
  presentation: Presentation;
}
