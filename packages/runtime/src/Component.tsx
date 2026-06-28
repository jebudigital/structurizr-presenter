import { motion } from "framer-motion";
import type { ComponentNode } from "@structurizr-presenter/core";

export interface ComponentProps {
  node: ComponentNode;
  state: "active" | "visible" | "dim";
}

export function Component({ node, state }: ComponentProps): JSX.Element {
  const cls = [
    "sp-component",
    state === "active" ? "sp-component-active" : "",
    state === "dim" ? "sp-component-dim" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.div
      layoutId={`component-${node.id}`}
      className={cls}
      style={{
        position: "absolute",
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
    >
      <div className="sp-component-kind">{node.kind}</div>
      <div className="sp-component-name">{node.name}</div>
    </motion.div>
  );
}
