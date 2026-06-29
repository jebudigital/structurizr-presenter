import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { Presentation, SceneStep } from "@structurizr-presenter/core";
import { Component } from "./Component.js";
import { Arrow } from "./Arrow.js";

export interface StageProps {
  presentation: Presentation;
  sceneIndex: number;
  stepIndex: number;
}

const STAGE_PADDING = 48;
const MAX_SCALE = 1.5;

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

  // The diagram is laid out once over the union of all casts, so component
  // coordinates are stable across scenes. We render edges (SVG) and components
  // (HTML) inside ONE fixed-size "world" box and scale that whole box to fit the
  // stage. Because both layers share the world's coordinate space, arrows always
  // attach to boxes, and because the world size is constant the Magic Move morph
  // between scenes stays smooth (no per-scene rescaling).
  const worldWidth = Math.max(presentation.width, 1);
  const worldHeight = Math.max(presentation.height, 1);

  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const compute = (): void => {
      const availW = el.clientWidth - STAGE_PADDING * 2;
      const availH = el.clientHeight - STAGE_PADDING * 2;
      if (availW <= 0 || availH <= 0) return;
      const next = Math.min(availW / worldWidth, availH / worldHeight, MAX_SCALE);
      setScale(next > 0 ? next : 1);
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [worldWidth, worldHeight]);

  return (
    <div className="sp-stage" ref={stageRef}>
      <div
        className="sp-world"
        style={{ width: worldWidth, height: worldHeight, transform: `scale(${scale})` }}
      >
        <svg
          width={worldWidth}
          height={worldHeight}
          viewBox={`0 0 ${worldWidth} ${worldHeight}`}
          style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}
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
