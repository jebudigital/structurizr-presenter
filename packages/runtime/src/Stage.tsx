import { AnimatePresence } from "framer-motion";
import type { Presentation, SceneStep } from "@structurizr-presenter/core";
import { Component } from "./Component.js";
import { Arrow } from "./Arrow.js";

export interface StageProps {
  presentation: Presentation;
  sceneIndex: number;
  stepIndex: number;
}

export function Stage({ presentation, sceneIndex, stepIndex }: StageProps): JSX.Element {
  const scene = presentation.scenes[sceneIndex]!;
  const step = scene.steps[stepIndex]!;
  const castSet = new Set(scene.cast);
  const highlightComponentSet = new Set(step.highlight.components);
  const highlightEdgeSet = new Set(step.highlight.edges);

  const visibleComponents = presentation.components.filter((c) => castSet.has(c.id));
  const visibleEdges = presentation.edges.filter(
    (e) => castSet.has(e.sourceId) && castSet.has(e.targetId)
  );

  const maxX = Math.max(...visibleComponents.map((c) => c.x + c.width), 800);
  const maxY = Math.max(...visibleComponents.map((c) => c.y + c.height), 600);

  return (
    <div className="sp-stage">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${maxX + 80} ${maxY + 80}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <defs>
          <marker
            id="sp-arrowhead"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sp-edge)" />
          </marker>
        </defs>
        <AnimatePresence>
          {visibleEdges.map((edge) => (
            <Arrow
              key={edge.id}
              edge={edge}
              state={edgeState(edge.id, highlightEdgeSet, step)}
            />
          ))}
        </AnimatePresence>
      </svg>
      <AnimatePresence>
        {visibleComponents.map((node) => (
          <Component
            key={node.id}
            node={node}
            state={componentState(node.id, highlightComponentSet, step)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function componentState(
  id: string,
  active: Set<string>,
  step: SceneStep
): "active" | "visible" | "dim" {
  if (active.has(id)) return "active";
  return step.mode === "pinpoint" ? "dim" : "visible";
}

function edgeState(
  id: string,
  active: Set<string>,
  step: SceneStep
): "active" | "visible" | "dim" {
  if (active.has(id)) return "active";
  return step.mode === "pinpoint" ? "dim" : "visible";
}
