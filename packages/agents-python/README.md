# Computer Agents Python SDK

[![PyPI version](https://img.shields.io/pypi/v/computer-agents.svg)](https://pypi.org/project/computer-agents/)
[![Python versions](https://img.shields.io/pypi/pyversions/computer-agents.svg)](https://pypi.org/project/computer-agents/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

The official Python SDK for the [Computer Agents](https://computer-agents.com) Cloud API. Build against the Agentic Compute Platform with threads, computers, resources, databases, skills, and agents.

## Installation

```bash
pip install computer-agents
```

## Quick Start

```python
from computer_agents import ComputerAgentsClient

client = ComputerAgentsClient(api_key="ca_your_api_key")

# Execute a task
result = client.run(
    "Create a REST API with Flask",
    computer_id="env_xxx",
    on_event=lambda e: print(e["type"]),
)

print(result.content)
print(f"Thread ID: {result.thread_id}")
```

## Multi-Turn Conversations

```python
# Create a thread for persistent conversation
thread = client.threads.create(environment_id="env_xxx")

# First message
result = client.threads.send_message(
    thread["id"],
    content="Create a Python web server",
    on_event=lambda e: print(e),
)

# Follow-up (continues same session)
result2 = client.threads.send_message(
    thread["id"],
    content="Add authentication to the server",
)
```

## Computers

```python
# Create a custom computer
computer = client.computers.create(
    name="data-science",
    internet_access=True,
    runtimes={"python": "3.12"},
)

# Install packages
client.computers.install_packages(computer["id"], "python", ["pandas", "numpy"])

# Add MCP servers
client.computers.update(
    computer["id"],
    mcp_servers=[{
        "type": "stdio",
        "name": "filesystem",
        "command": "npx",
        "args": ["@modelcontextprotocol/server-filesystem", "/workspace"],
    }],
)
```

## Computer Change History

```python
history = client.computers.list_changes(
    computer["id"],
    limit=25,
    project_id="proj_123",
    operation=["created", "modified"],
)

latest = history["data"][0]
latest_file = latest["files"][0]

diff = client.computers.get_change_diff(
    computer["id"],
    latest["id"],
    path=latest_file["path"],
)

file_state = client.computers.get_change_file(
    computer["id"],
    latest["id"],
    path=latest_file["path"],
)

fork = client.computers.fork_from_change(
    computer["id"],
    latest["id"],
    name="history-branch",
)
```

## Agents

```python
# Create a custom agent
agent = client.agents.create(
    name="Code Reviewer",
    model="claude-sonnet-4-5",
    instructions="You are a thorough code reviewer.",
    enabled_skills=["web_search"],
)

# Use the agent
thread = client.threads.create(
    computer_id="env_xxx",
    agent_id=agent["id"],
)
```

## Files

```python
# Upload a file
client.files.upload_file(
    "env_xxx",
    filename="app.py",
    content='print("hello")',
    path="src",
)

# Download a file
content = client.files.get_file("env_xxx", "src/app.py")

# List files
files = client.files.list_files("env_xxx")
```

## Git Operations

```python
diff = client.git.diff("env_xxx")
client.git.commit("env_xxx", message="Update feature")
client.git.push("env_xxx")
```

## Schedules

```python
schedule = client.schedules.create(
    name="Daily Report",
    agent_id="agent_xxx",
    agent_name="Reporter",
    task="Generate daily report",
    schedule_type="recurring",
    cron_expression="0 9 * * *",
)
```

## Resources

```python
resource = client.resources.create(
    name="crm-web",
    kind="web_app",
    auth_mode="public",
)

client.resources.deploy(resource["id"])
analytics = client.resources.get_analytics(resource["id"])
```

## Databases

```python
database = client.databases.create(name="crm-data")

client.databases.create_collection(database["id"], name="leads")
client.databases.create_document(
    database["id"],
    "leads",
    data={"company": "Acme", "stage": "new"},
)
```

## Skills

```python
skills = client.skills.list()
print([skill["name"] for skill in skills])
```

## Configuration

The API key can be provided via:

1. Constructor argument: `ComputerAgentsClient(api_key="ca_...")`
2. Environment variable: `COMPUTER_AGENTS_API_KEY`

```python
# Custom base URL and timeout
client = ComputerAgentsClient(
    api_key="ca_...",
    base_url="https://custom-api.example.com",
    timeout=120.0,
    debug=True,
)
```

## Context Manager

```python
with ComputerAgentsClient(api_key="ca_...") as client:
    result = client.run("Hello world", computer_id="env_xxx")
    print(result.content)
# Client is automatically closed
```

## API Resources

| Resource | Description |
|----------|-------------|
| `client.threads` | Conversation management with SSE streaming |
| `client.environments` / `client.computers` | Computer configuration and lifecycle |
| `client.agents` | Agent configuration (model, instructions, skills) |
| `client.resources` | Web apps, functions, auth modules, and runtimes |
| `client.databases` | Managed database surfaces |
| `client.skills` | Custom ACP skills |
| `client.files` | File management in computer workspaces |
| `client.schedules` | Scheduled task management |
| `client.triggers` | Event-driven triggers |
| `client.orchestrations` | Agent-to-agent orchestration |
| `client.budget` | Budget and usage tracking |
| `client.billing` | Billing records and statistics |
| `client.git` | Git operations on computer workspaces |

## Requirements

- Python >= 3.9
- httpx >= 0.25.0

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT - see [LICENSE](LICENSE) for details.
