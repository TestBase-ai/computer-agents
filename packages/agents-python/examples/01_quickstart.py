"""Quickstart - Execute a task with Computer Agents."""

from computer_agents import ComputerAgentsClient

# Initialize the client (reads COMPUTER_AGENTS_API_KEY from env)
client = ComputerAgentsClient()

# Execute a task — no setup needed, environment is created automatically
result = client.run(
    "Create a Python file that prints 'Hello, World!'",
    on_event=lambda e: print(f"  [{e.get('type')}]"),
)

print(f"\nResponse: {result.content}")
print(f"Thread ID: {result.thread_id}")

# Continue the conversation
follow_up = client.run(
    "Now modify it to accept a name argument",
    thread_id=result.thread_id,
    on_event=lambda e: print(f"  [{e.get('type')}]"),
)

print(f"\nFollow-up: {follow_up.content}")

client.close()
