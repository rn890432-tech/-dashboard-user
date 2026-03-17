# Red Team Console Full Automation Scripts

## Overview

This module provides scripts for full automation of scenario loading, simulation scheduling, result polling, audit log export, and integration testing for the Red Team Console.

### Backend Scripts

- **automation.py**: Loads and validates scenarios, launches simulations, polls results and graph overlays, exports audit log, and runs integration tests.
- **auto_scheduler.py**: Schedules simulation runs for all scenarios at a configurable interval.

### Frontend Scripts

- **auto_preview.js**: Previews scenarios, simulation results, graph overlays, and audit log entries.
- **auto_export_audit.js**: Exports audit log as CSV.

### Running Integration Tests

- **test_automation.py**: Pytest integration tests for scenario loading, simulation launch, and audit log export.

## Usage

### Backend Automation

1. Run `automation.py` to auto-load scenarios, launch simulations, poll results, export audit log, and run tests:

   ```bash
   python backend/src/redteam/automation.py
   ```

2. Run `auto_scheduler.py` to schedule simulation runs:

   ```bash
   python backend/src/redteam/auto_scheduler.py
   ```

### Frontend Automation

1. Run `auto_preview.js` for scenario/result/audit preview:

   ```bash
   node frontend/scripts/auto_preview.js
   ```

2. Run `auto_export_audit.js` to export audit log as CSV:

   ```bash
   node frontend/scripts/auto_export_audit.js
   ```

### Integration Tests

1. Run pytest integration tests:

   ```bash
   pytest backend/tests/redteam/
   ```

## Notes

- Ensure backend API is running at `http://localhost:8000/redteam`.
- Update scenario IDs in `auto_scheduler.py` as needed.
- Scripts are modular and extensible for further automation.
