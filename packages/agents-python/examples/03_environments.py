"""Environment management - runtimes, packages, and configuration."""

from computer_agents import ComputerAgentsClient

client = ComputerAgentsClient()

# Create a custom environment
env = client.environments.create(
    name="data-science",
    description="Environment for data analysis",
    compute_profile="standard",
    internet_access=True,
    runtimes={"python": "3.12", "nodejs": "20"},
)
print(f"Created environment: {env['id']}")

# Install packages
result = client.environments.install_packages(
    env["id"], "python", ["pandas", "numpy", "matplotlib"]
)
print(f"Installed: {result['installed']}")

# Check available runtimes
runtimes = client.environments.list_available_runtimes()
print(f"Available Python versions: {runtimes['python']}")

# Add MCP servers
env = client.environments.update(
    env["id"],
    compute_profile="power",
    mcp_servers=[
        {
            "type": "stdio",
            "name": "filesystem",
            "command": "npx",
            "args": ["@modelcontextprotocol/server-filesystem", "/workspace"],
        }
    ],
)

# Trigger a build
build = client.environments.trigger_build(env["id"])
print(f"Build started: {build['status']}")

# Check build status
status = client.environments.get_build_status(env["id"])
print(f"Build status: {status['buildStatus']}")

# List all environments
envs = client.environments.list()
for e in envs:
    print(f"  - {e['name']} ({e['id']}): {e.get('status', 'unknown')}")

client.close()
