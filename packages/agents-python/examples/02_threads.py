"""Multi-turn conversations with threads."""

from computer_agents import ComputerAgentsClient

client = ComputerAgentsClient()

# Create a thread for a persistent conversation
thread = client.threads.create(environment_id="env_xxx")
print(f"Created thread: {thread['id']}")

# First message
result = client.threads.send_message(
    thread["id"],
    content="Create a Python web server using Flask",
    on_event=lambda e: print(f"  [{e.get('type')}]"),
)
print(f"\nResponse 1: {result.content[:200]}...")

# Follow-up (continues same session)
result2 = client.threads.send_message(
    thread["id"],
    content="Add a /health endpoint that returns JSON",
    on_event=lambda e: print(f"  [{e.get('type')}]"),
)
print(f"\nResponse 2: {result2.content[:200]}...")

# List threads
threads = client.threads.list(limit=5)
print(f"\nTotal threads: {threads['total']}")
for t in threads["data"]:
    print(f"  - {t['id']}: {t.get('title', 'Untitled')} ({t['status']})")

# Search threads
results = client.threads.search("Flask", limit=5)
for r in results["results"]:
    print(f"  Match: {r['thread'].get('title')} (score: {r['score']})")

# Copy a thread
copy = client.threads.copy(thread["id"], title="Flask experiment v2")
print(f"\nCopied thread: {copy['id']}")

client.close()
