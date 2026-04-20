"""File operations on environment workspaces."""

from computer_agents import ComputerAgentsClient

client = ComputerAgentsClient()

env_id = "env_xxx"

# Upload a file
result = client.files.upload_file(
    env_id,
    filename="app.py",
    content='print("Hello from Computer Agents!")',
    path="src",
)
print(f"Uploaded: {result['path']}")

# List files
files = client.files.list_files(env_id)
for f in files:
    print(f"  {f['type']:>9s}  {f['size']:>8d}  {f['path']}")

# Download a file
content = client.files.get_file(env_id, "src/app.py")
print(f"\nFile content:\n{content}")

# Create a directory
client.files.create_directory(env_id, "src/utils")

# Move/rename a file
client.files.move_file(env_id, "src/app.py", "src/main.py")
print("Renamed app.py -> main.py")

# Delete a file
client.files.delete_file(env_id, "src/main.py")
print("Deleted src/main.py")

client.close()
