import { useEffect, useState } from "react";
import type { IRPayload, Presentation } from "@structurizr-presenter/core";
import { Stage } from "./Stage.js";

export interface AppProps {
  ir: IRPayload;
}

export function App({ ir }: AppProps): JSX.Element {
  const { presentation } = ir;
  const [sceneIndex, setSceneIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const totalSteps = countSteps(presentation);
  const stepNumber = absoluteStepNumber(presentation, sceneIndex, stepIndex);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        advance(presentation, sceneIndex, stepIndex, setSceneIndex, setStepIndex);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        retreat(presentation, sceneIndex, stepIndex, setSceneIndex, setStepIndex);
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      } else if (e.key === "Escape") {
        if (document.fullscreenElement) document.exitFullscreen();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presentation, sceneIndex, stepIndex]);

  const scene = presentation.scenes[sceneIndex]!;
  const step = scene.steps[stepIndex]!;

  return (
    <div className="sp-app">
      <div className="sp-header">
        <div className="sp-title">{presentation.title}</div>
        <div className="sp-step-title">
          {scene.title}
          {step.title ? ` — ${step.title}` : ""}
        </div>
      </div>
      <div className="sp-progress">
        <div
          className="sp-progress-bar"
          style={{ width: `${((stepNumber + 1) / totalSteps) * 100}%` }}
        />
      </div>
      <Stage presentation={presentation} sceneIndex={sceneIndex} stepIndex={stepIndex} />
      <button className="sp-fs-btn" onClick={toggleFullscreen} aria-label="Fullscreen">
        ⛶
      </button>
      <div className="sp-narration">{step.narration ?? ""}</div>
    </div>
  );
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
}

function advance(
  p: Presentation,
  si: number,
  ti: number,
  setSi: (n: number) => void,
  setTi: (n: number) => void
): void {
  const scene = p.scenes[si]!;
  if (ti + 1 < scene.steps.length) {
    setTi(ti + 1);
  } else if (si + 1 < p.scenes.length) {
    setSi(si + 1);
    setTi(0);
  }
}

function retreat(
  p: Presentation,
  si: number,
  ti: number,
  setSi: (n: number) => void,
  setTi: (n: number) => void
): void {
  if (ti > 0) {
    setTi(ti - 1);
  } else if (si > 0) {
    const prev = p.scenes[si - 1]!;
    setSi(si - 1);
    setTi(prev.steps.length - 1);
  }
}

function countSteps(p: Presentation): number {
  return p.scenes.reduce((acc, s) => acc + s.steps.length, 0);
}

function absoluteStepNumber(p: Presentation, si: number, ti: number): number {
  let n = 0;
  for (let i = 0; i < si; i++) n += p.scenes[i]!.steps.length;
  return n + ti;
}
