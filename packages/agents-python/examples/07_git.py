"""Git operations on cloud workspaces."""

from computer_agents import ComputerAgentsClient

client = ComputerAgentsClient()

env_id = "env_xxx"

# Check for uncommitted changes
diff = client.git.diff(env_id)
print(f"Files changed: {diff.get('stats', {}).get('filesChanged', 0)}")
for d in diff.get("diffs", []):
    print(f"  {d['path']}: +{d.get('additions', 0)} -{d.get('deletions', 0)}")

# Commit changes
if diff.get("diffs"):
    result = client.git.commit(
        env_id,
        message="Update from Computer Agents",
        author={"name": "Computer Agent", "email": "agent@computer-agents.com"},
    )
    print(f"Committed: {result['commit']['sha']}")

    # Push to remote
    push = client.git.push(env_id)
    print(f"Pushed {push['push']['commits']} commits to {push['push']['branch']}")

client.close()
