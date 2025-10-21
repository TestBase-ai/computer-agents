import { access, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

// Use require for CommonJS package
const require = createRequire(import.meta.url);
const { Agent, run, LocalRuntime } = require("computer-agents");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, "..", "..", "..");
const WORKSPACE_ROOT = resolve(PROJECT_ROOT, "docs", "workflow-demo");

async function fileExists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const codexWorkerAgent = new Agent({
  name: "Testbase Codex Worker",
  agentType: "computer",
  runtime: new LocalRuntime({
    debug: true,
  }),
  workspace: WORKSPACE_ROOT,
  instructions:
    "You are a computer-use agent. Execute repository changes requested by the user.",
  handoffDescription:
    "Executes repository changes via the Codex CLI worker agent.",
  // codexMcpServers: [
  //   {
  //     name: "notion",
  //     command: "npx",
  //     args: ["mcp-remote", "https://your-server/mcp", "--header", "Authorization: Bearer TOKEN"],
  //   },
  // ],
});

async function main() {
  console.log("=== Hello World Example with Session Continuity ===\n");

  // Turn 1: Create initial file
  console.log("Turn 1: Creating helloWorld.py...");
  console.log(`Thread ID before: ${codexWorkerAgent.currentThreadId || 'undefined (no session yet)'}\n`);

  const request1 =
    'Create helloWorld.py that prints "Hello from Testbase Agents!" when executed.';
  const result1 = await run(codexWorkerAgent, request1);

  console.log("Turn 1 complete!");
  console.log(`Thread ID after: ${codexWorkerAgent.currentThreadId}\n`);
  console.log(result1.finalOutput ?? "(no response)");

  // Turn 2: Add a feature (should continue same session automatically!)
  console.log("\n\nTurn 2: Adding a main function (continuing session)...");
  const request2 = 'Add a main() function with if __name__ == "__main__" guard';
  const result2 = await run(codexWorkerAgent, request2);

  console.log("Turn 2 complete!");
  console.log(`Thread ID: ${codexWorkerAgent.currentThreadId} (same session!)\n`);
  console.log(result2.finalOutput ?? "(no response)");

  // Verify the file
  const targetFile = join(WORKSPACE_ROOT, "helloWorld.py");
  if (await fileExists(targetFile)) {
    const contents = await readFile(targetFile, "utf8");
    console.log("\n\nhelloWorld.py final contents:\n");
    console.log(contents);
  } else {
    console.warn(`Expected file ${targetFile} was not found.`);
  }

  console.log("\n\n=== Session Continuity Demo Complete ===");
  console.log("Key feature: The second run() automatically continued the conversation!");
  console.log("No manual session management required. 🎉");
}

if (process.argv[1]) {
  const entryUrl = pathToFileURL(process.argv[1]).href;
  if (entryUrl === import.meta.url) {
    main().catch((error) => {
      console.error("Demo failed:", error);
      process.exitCode = 1;
    });
  }
}
