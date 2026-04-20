"""Agent configuration and management."""

from computer_agents import ComputerAgentsClient

client = ComputerAgentsClient()

# Create a custom agent
agent = client.agents.create(
    name="Code Reviewer",
    model="claude-sonnet-4-5",
    instructions="You are a thorough code reviewer. Focus on security, performance, and readability.",
    reasoning_effort="high",
    enabled_skills=["web_search"],
)
print(f"Created agent: {agent['id']}")

# Use the agent in a thread
thread = client.threads.create(
    environment_id="env_xxx",
    agent_id=agent["id"],
)

result = client.threads.send_message(
    thread["id"],
    content="Review the code in src/server.py for security issues",
    on_event=lambda e: print(f"  [{e.get('type')}]"),
)
print(f"\nReview: {result.content[:300]}...")

# List agents
agents = client.agents.list()
for a in agents:
    print(f"  - {a['name']} ({a['model']})")

# Update agent
updated = client.agents.update(
    agent["id"],
    instructions="Focus only on security vulnerabilities.",
)
print(f"Updated agent: {updated['name']}")

client.close()
