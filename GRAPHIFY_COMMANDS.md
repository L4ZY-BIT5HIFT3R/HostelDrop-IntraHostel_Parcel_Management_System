# Graphify CLI Commands (with Examples)

This file documents all commands shown by `graphify --help` on this machine.

## General Syntax

```bash
graphify <command> [options]
```

## Core Commands

| Command | What it does | Example |
|---|---|---|
| `graphify install --platform <platform>` | Copy Graphify skill to a platform config directory. | `graphify install --platform codex` |
| `graphify path "A" "B" --graph <path>` | Find the shortest path between two nodes in `graph.json`. | `graphify path "Authentication" "Parcel Delivery" --graph graphify-out/graph.json` |
| `graphify explain "X" --graph <path>` | Explain a node and nearby relationships in plain language. | `graphify explain "OTP Verification" --graph graphify-out/graph.json` |
| `graphify add <url> [--author "..."] [--contributor "..."] [--dir <path>]` | Fetch a URL into raw corpus and update the graph. | `graphify add "https://example.com/architecture" --author "Team Docs" --contributor "Soumya" --dir ./raw` |
| `graphify watch <path>` | Watch a folder and rebuild graph on code changes. | `graphify watch ./backend` |
| `graphify update <path>` | Re-extract code files and update graph without LLM. | `graphify update .` |
| `graphify cluster-only <path>` | Re-run clustering for an existing graph and regenerate report. | `graphify cluster-only graphify-out/graph.json` |
| `graphify query "<question>" [--dfs] [--budget N] [--graph <path>]` | Traverse graph to answer a question. | `graphify query "How does parcel OTP flow work?" --budget 1200 --graph graphify-out/graph.json` |
| `graphify save-result --question Q --answer A [--type T] [--nodes N1 N2 ...] [--memory-dir DIR]` | Save a Q&A result into Graphify memory loop. | `graphify save-result --question "How is OTP validated?" --answer "Guard verifies OTP before marking delivered." --type query --nodes "send_parcel_otp" "verify_parcel_otp"` |
| `graphify benchmark [graph.json]` | Compare graph-based reduction vs naive full-corpus approach. | `graphify benchmark graphify-out/graph.json` |

## Git Hook Commands

| Command | What it does | Example |
|---|---|---|
| `graphify hook install` | Install post-commit and post-checkout hooks. | `graphify hook install` |
| `graphify hook uninstall` | Remove installed Graphify hooks. | `graphify hook uninstall` |
| `graphify hook status` | Show whether hooks are installed. | `graphify hook status` |

## Gemini Integration

| Command | What it does | Example |
|---|---|---|
| `graphify gemini install` | Add GEMINI.md section and BeforeTool hook. | `graphify gemini install` |
| `graphify gemini uninstall` | Remove GEMINI.md section and hook. | `graphify gemini uninstall` |

## Cursor Integration

| Command | What it does | Example |
|---|---|---|
| `graphify cursor install` | Write `.cursor/rules/graphify.mdc`. | `graphify cursor install` |
| `graphify cursor uninstall` | Remove `.cursor/rules/graphify.mdc`. | `graphify cursor uninstall` |

## Claude Code Integration

| Command | What it does | Example |
|---|---|---|
| `graphify claude install` | Add Graphify section to `CLAUDE.md` and PreToolUse hook. | `graphify claude install` |
| `graphify claude uninstall` | Remove Graphify section from `CLAUDE.md` and hook. | `graphify claude uninstall` |

## Codex Integration

| Command | What it does | Example |
|---|---|---|
| `graphify codex install` | Add Graphify section to `AGENTS.md`. | `graphify codex install` |
| `graphify codex uninstall` | Remove Graphify section from `AGENTS.md`. | `graphify codex uninstall` |

## OpenCode Integration

| Command | What it does | Example |
|---|---|---|
| `graphify opencode install` | Add Graphify to `AGENTS.md` and plugin hook. | `graphify opencode install` |
| `graphify opencode uninstall` | Remove Graphify from `AGENTS.md` and plugin hook. | `graphify opencode uninstall` |

## Aider Integration

| Command | What it does | Example |
|---|---|---|
| `graphify aider install` | Add Graphify section to `AGENTS.md` for Aider. | `graphify aider install` |
| `graphify aider uninstall` | Remove Graphify section from `AGENTS.md` for Aider. | `graphify aider uninstall` |

## GitHub Copilot CLI Integration

| Command | What it does | Example |
|---|---|---|
| `graphify copilot install` | Copy skill to `~/.copilot/skills`. | `graphify copilot install` |
| `graphify copilot uninstall` | Remove skill from `~/.copilot/skills`. | `graphify copilot uninstall` |

## VS Code Copilot Chat Integration

| Command | What it does | Example |
|---|---|---|
| `graphify vscode install` | Configure VS Code Copilot Chat files. | `graphify vscode install` |
| `graphify vscode uninstall` | Remove VS Code Copilot Chat config. | `graphify vscode uninstall` |

## OpenClaw Integration

| Command | What it does | Example |
|---|---|---|
| `graphify claw install` | Add Graphify section to `AGENTS.md` for OpenClaw. | `graphify claw install` |
| `graphify claw uninstall` | Remove Graphify section from `AGENTS.md` for OpenClaw. | `graphify claw uninstall` |

## Factory Droid Integration

| Command | What it does | Example |
|---|---|---|
| `graphify droid install` | Add Graphify section to `AGENTS.md` for Factory Droid. | `graphify droid install` |
| `graphify droid uninstall` | Remove Graphify section from `AGENTS.md` for Factory Droid. | `graphify droid uninstall` |

## Trae Integration

| Command | What it does | Example |
|---|---|---|
| `graphify trae install` | Add Graphify section to `AGENTS.md` for Trae. | `graphify trae install` |
| `graphify trae uninstall` | Remove Graphify section from `AGENTS.md` for Trae. | `graphify trae uninstall` |

## Trae CN Integration

| Command | What it does | Example |
|---|---|---|
| `graphify trae-cn install` | Add Graphify section to `AGENTS.md` for Trae CN. | `graphify trae-cn install` |
| `graphify trae-cn uninstall` | Remove Graphify section from `AGENTS.md` for Trae CN. | `graphify trae-cn uninstall` |

## Google Antigravity Integration

| Command | What it does | Example |
|---|---|---|
| `graphify antigravity install` | Write `.agent/rules`, `.agent/workflows`, and skill files. | `graphify antigravity install` |
| `graphify antigravity uninstall` | Remove `.agent/rules`, `.agent/workflows`, and skill files. | `graphify antigravity uninstall` |

## Hermes Integration

| Command | What it does | Example |
|---|---|---|
| `graphify hermes install` | Write skill to `~/.hermes/skills/graphify/`. | `graphify hermes install` |
| `graphify hermes uninstall` | Remove skill from `~/.hermes/skills/graphify/`. | `graphify hermes uninstall` |

## Kiro Integration

| Command | What it does | Example |
|---|---|---|
| `graphify kiro install` | Write skill to `.kiro/skills/graphify/` and steering file. | `graphify kiro install` |
| `graphify kiro uninstall` | Remove Kiro Graphify skill and steering file. | `graphify kiro uninstall` |

## Notes

- Use `graphify --help` any time to re-check available commands.
- Default graph path for supported commands is `graphify-out/graph.json`.
- For commands with quoted text, keep quotes around values with spaces.
