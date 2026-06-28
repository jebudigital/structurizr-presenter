import type { IRPayload } from "@structurizr-presenter/core";

export interface AppProps {
  ir: IRPayload;
}

export function App({ ir }: AppProps): JSX.Element {
  return <div>structurizr-presenter loaded: {ir.presentation.title}</div>;
}
