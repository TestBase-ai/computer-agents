"""Scheduled task management."""

from computer_agents import ComputerAgentsClient

client = ComputerAgentsClient()

# Create a recurring schedule
schedule = client.schedules.create(
    name="Daily Health Check",
    agent_id="agent_xxx",
    agent_name="Monitor",
    task="Run health checks on all services and generate a report",
    schedule_type="recurring",
    cron_expression="0 9 * * *",  # Every day at 9am
    timezone="America/New_York",
    environment_id="env_xxx",
)
print(f"Created schedule: {schedule['id']}")
print(f"Next run: {schedule.get('nextRunAt')}")

# List schedules
schedules = client.schedules.list()
for s in schedules:
    status = "enabled" if s.get("enabled") else "disabled"
    print(f"  - {s['name']} ({status})")

# Manually trigger
trigger_result = client.schedules.trigger(schedule["id"])
print(f"Triggered: {trigger_result}")

# Disable
client.schedules.disable(schedule["id"])
print("Schedule disabled")

# Re-enable
client.schedules.enable(schedule["id"])
print("Schedule re-enabled")

client.close()
