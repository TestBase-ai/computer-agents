"use strict";
/**
 * File Operations
 *
 * Upload, download, and manage files in environment workspaces.
 *
 * Usage:
 *   COMPUTER_AGENTS_API_KEY=your-key npx tsx examples/06-file-operations.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const computer_agents_1 = require("computer-agents");
const client = new computer_agents_1.ComputerAgentsClient({
    apiKey: process.env.COMPUTER_AGENTS_API_KEY,
});
// Use your environment ID
const envId = process.env.ENVIRONMENT_ID || 'env_xxx';
// Upload a file
await client.files.uploadFile({
    environmentId: envId,
    path: 'src/app.py',
    content: `
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    app.run(port=5000)
`.trim(),
});
console.log('Uploaded src/app.py');
// Create a directory
await client.files.createDirectory({
    environmentId: envId,
    path: 'tests',
});
console.log('Created tests/ directory');
// Upload another file
await client.files.uploadFile({
    environmentId: envId,
    path: 'tests/test_app.py',
    content: `
import pytest
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_health(client):
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json['status'] == 'ok'
`.trim(),
});
console.log('Uploaded tests/test_app.py');
// List all files
const files = await client.files.listFiles(envId);
console.log(`\nFiles in workspace (${files.length}):`);
for (const file of files) {
    const icon = file.type === 'directory' ? '/' : '';
    console.log(`  ${file.path}${icon}`);
}
// Download a file
const content = await client.files.getFile(envId, 'src/app.py');
console.log('\nContents of src/app.py:');
console.log(content);
//# sourceMappingURL=06-file-operations.js.map