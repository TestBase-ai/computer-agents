# Contributing to Computer Agents Python SDK

Thank you for your interest in contributing! This document provides guidelines for contributing to the Computer Agents Python SDK.

## Getting Started

### Prerequisites

- Python 3.9 or higher
- pip or uv for package management

### Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/computer-agents/computer-agents-python.git
   cd computer-agents-python
   ```

2. Create a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. Install in development mode:
   ```bash
   pip install -e ".[dev]"
   ```

## Development

### Project Structure

```
computer-agents-python/
├── computer_agents/
│   ├── __init__.py          # Public API exports
│   ├── client.py            # ComputerAgentsClient
│   ├── _api_client.py       # Low-level HTTP client
│   ├── _exceptions.py       # Exception classes
│   ├── types.py             # TypedDict type definitions
│   ├── py.typed             # PEP 561 marker
│   └── resources/           # API resource managers
│       ├── threads.py
│       ├── environments.py
│       ├── agents.py
│       ├── files.py
│       ├── schedules.py
│       ├── triggers.py
│       ├── orchestrations.py
│       ├── budget.py
│       ├── git.py
│       └── projects.py
├── examples/                # Usage examples
├── tests/                   # Test suite
├── pyproject.toml           # Package configuration
└── README.md
```

### Running Tests

```bash
pytest
```

### Type Checking

```bash
mypy computer_agents
```

### Code Style

We follow standard Python conventions:
- PEP 8 for code style
- PEP 257 for docstrings
- Type hints throughout (PEP 484)
- snake_case for functions and variables
- PascalCase for classes

Use ruff for linting and formatting:
```bash
ruff check .
ruff format .
```

## Making Changes

### Pull Request Process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature
   ```

2. Make your changes with clear, descriptive commits

3. Ensure all tests pass and types check

4. Push and open a pull request against `main`

### Commit Messages

Use clear, descriptive commit messages:
- `fix: resolve SSE streaming timeout issue`
- `feat: add async client support`
- `docs: update environment examples`

### What Makes a Good PR

- **Focused**: One feature or fix per PR
- **Tested**: Include tests for new functionality
- **Documented**: Update README or docstrings if needed
- **Typed**: All new code should have type annotations
- **Compatible**: Maintain Python 3.9+ compatibility

## Reporting Issues

- **Bugs**: Use the bug report template
- **Features**: Use the feature request template
- **Security**: See [SECURITY.md](SECURITY.md)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
