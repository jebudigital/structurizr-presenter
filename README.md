# structurizr-presenter

> Presentation-as-code for C4 architectures. Turn your Structurizr model into a live, choreographed deck.

**Status:** Pre-alpha (private development). Will go public + npm at v0.1 release.

## What it does

Take an existing Structurizr `workspace.dsl`, write a YAML scene file that picks components and choreographs spotlights, and get a self-contained static presentation that morphs between scenes. Drop the output into any static-site host (Hugo, S3, GitHub Pages) and link to it.

## Install (from GitHub Release, no npm needed)

```bash
npm install -g https://github.com/jebudigital/structurizr-presenter/releases/download/<tag>/structurizr-presenter-<version>.tgz
```

Or clone + link for local development (see [CONTRIBUTING.md](CONTRIBUTING.md) — coming).

## Quickstart

```bash
structurizr-presenter init                          # scaffold a presentation
structurizr-presenter validate -d workspace.dsl -s scenes/my-talk.yaml
structurizr-presenter build -d workspace.dsl -s scenes/my-talk.yaml -o dist/my-talk
# now open dist/my-talk/index.html in a browser, or upload to your static host
```

## Privacy & telemetry

Zero telemetry, by design. No network calls. Corporate-use-friendly.

## License

Apache-2.0 — see [LICENSE](LICENSE).
