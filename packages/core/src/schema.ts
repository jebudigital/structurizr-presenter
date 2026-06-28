export const sceneSchema = {
  $id: "https://structurizr-presenter.jebudigital.dev/schema/scene.schema.json",
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "StructurizrPresenterScene",
  type: "object",
  required: ["title", "scenes"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    subtitle: { type: "string" },
    defaults: {
      type: "object",
      additionalProperties: false,
      properties: {
        mode: { type: "string", enum: ["trailing", "sticky", "pinpoint"] },
      },
    },
    scenes: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/scene" },
    },
  },
  $defs: {
    scene: {
      type: "object",
      required: ["id", "title", "cast", "steps"],
      additionalProperties: false,
      properties: {
        id: { type: "string", pattern: "^[a-zA-Z][a-zA-Z0-9_-]*$" },
        title: { type: "string", minLength: 1 },
        cast: {
          type: "array",
          minItems: 1,
          items: { type: "string", minLength: 1 },
        },
        steps: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/$defs/step" },
        },
      },
    },
    step: {
      type: "object",
      required: ["spotlight"],
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        narration: { type: "string" },
        spotlight: { type: "string", minLength: 1 },
        mode: { type: "string", enum: ["trailing", "sticky", "pinpoint"] },
      },
    },
  },
} as const;

export type SceneSchema = typeof sceneSchema;
