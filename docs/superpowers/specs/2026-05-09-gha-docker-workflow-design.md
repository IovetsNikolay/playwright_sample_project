# GHA Docker Workflow Design

**Date:** 2026-05-09

## Goal

Replace the existing bare-metal GHA workflow with one that runs Playwright tests inside the official Playwright Docker image, injects env vars from GitHub repo variables/secrets, and uploads the HTML report as an artifact.

## Triggers

- `push` to `main`
- `pull_request` targeting `main`

## Approach

`docker run` step on `ubuntu-latest`. The workspace is volume-mounted into the container so the HTML report lands on the host filesystem and can be uploaded without extra copy steps.

## Workflow Steps

1. `actions/checkout@v4`
2. `docker run --rm --ipc=host -v ${{ github.workspace }}:/app -w /app -e BASE_URL=${{ vars.BASE_URL }} mcr.microsoft.com/playwright:v1.59.1-noble bash -c "npm ci && npx playwright test"`
3. `actions/upload-artifact@v4` — uploads `playwright-report/`, retention 30 days, `if: always()`

## Docker Image

`mcr.microsoft.com/playwright:v1.59.1-noble` — matches the `@playwright/test` version in `package.json`. Browsers are pre-bundled; no `playwright install` step needed.

## Environment Variables

- Non-sensitive config (e.g. `BASE_URL`) → GitHub repo **Variable** (`vars.BASE_URL`), set in *Settings → Variables → Actions*.
- Credentials → GitHub repo **Secret** (`secrets.*`), passed via additional `-e` flags.
- `.env` is local-only and must never be committed.

## .env Handling

- Add `.env` to `.gitignore`
- `git rm --cached .env` to untrack the currently committed file
- Local `.env` continues to work for local runs via `dotenv` in `playwright.config.ts`

## Files Changed

| File | Change |
|---|---|
| `.github/workflows/playwright.yml` | Replaced entirely |
| `.gitignore` | Add `.env` entry |
