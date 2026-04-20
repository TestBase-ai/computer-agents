# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.6.1] - 2026-04-20

### Added

- Added typed computer change-history support:
  - `list_changes`
  - `get_change_diff`
  - `get_change_file`
  - `fork_from_change`
- Added exported Python types for computer snapshots, file-level change records, paged change history, historical file reads, and historical computer forks.

### Changed

- Expanded README examples to document computer state history, diff inspection, and branching from a historical file change.

## [2.2.0] - 2025-02-14

### Added

- Initial release of the Computer Agents Python SDK
- Full API parity with the [TypeScript SDK](https://github.com/TestBase-ai/computer-agents) v2.2.0
- Resources: threads, environments, agents, files, schedules, triggers, orchestrations, budget, billing, git, projects
- SSE streaming support for real-time agent responses
- Context manager support for automatic cleanup
- Comprehensive type definitions using TypedDict
- 7 usage examples covering all major features
- PEP 561 typed package marker
