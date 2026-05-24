---
title: Positron CLI Workflow
date: 2026-05-24
author: Positron Team
---

# Positron CLI

The `apps/server` package exposes a `positron` bin for starting runs without the web UI.

## Prerequisites

- The server must be running.
- The workspace must be built or linked so the `positron` bin is available.

## Usage

```bash
positron run --issueNumber 42 --autonomyLevel 2
```

## Options

- `--issueNumber <n>`: required GitHub issue number
- `--autonomyLevel <n>`: `0`, `1`, or `2` (default: `2`)
- `--repoId <id>`: repository id (default: `repo-1`)
- `--serverUrl <url>`: server base URL (default: `http://localhost:3000`)
- `--help`: show help text

## Behavior

- Sends a `POST` request to the server REST API at `/api/repos/:repoId/runs`
- Prints the created run id, phase, status, and event count
- Exits with an error if the server is unreachable or returns a non-2xx response

## Examples

```bash
positron run --issueNumber 42
positron run --issueNumber 42 --autonomyLevel 1
positron run --issueNumber 42 --repoId repo-1 --serverUrl http://localhost:3000
```
