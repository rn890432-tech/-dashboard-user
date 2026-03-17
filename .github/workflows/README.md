# Workflow Guide

This repository uses a split CI/CD model.

## Workflows

- `ci.yml` (`CI - Build & Test`)
  - Triggered on `push` (`main`, `staging`) and `pull_request`
  - Runs install, Jest, build, and conditional Cypress checks
  - Uses cache for npm, `node_modules`, and Cypress binaries

- `cd.yml` (`CD - Deploy`)
  - Triggered after successful CI via `workflow_run`
  - Can also be started manually via `workflow_dispatch`
  - Handles staging deploy, production approval gate, production deploy, and post-deploy checks

## Environment gates

- `staging` environment: used by staging deploy job
- `production` environment: used by approval and production deploy jobs

To enforce manual approval, configure required reviewers on the `production` environment in GitHub settings.

## Secrets behavior

- Deploy token (`VERCEL_TOKEN`) is consumed only in deploy path jobs.
- If deploy secret is missing, deploy steps are skipped safely (no crash in baseline pipeline flow).
