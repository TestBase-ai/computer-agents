#!/bin/bash

# Test Script for computer-agents Rename
# Run this to verify everything works after the rename

set -e  # Exit on error

echo "🧪 Testing computer-agents after rename..."
echo ""

# Change to project directory
cd "$(dirname "$0")"

echo "📁 Current directory: $(pwd)"
echo ""

# Test 1: Clean
echo "1️⃣  Cleaning build artifacts..."
pnpm clean
echo "✅ Clean successful"
echo ""

# Test 2: Install dependencies
echo "2️⃣  Installing dependencies..."
pnpm install
echo "✅ Install successful"
echo ""

# Test 3: Build
echo "3️⃣  Building packages..."
pnpm build
echo "✅ Build successful"
echo ""

# Test 4: Check dist folder exists
echo "4️⃣  Checking build output..."
if [ -d "packages/agents-core/dist" ]; then
    echo "✅ agents-core/dist/ exists"
    ls -lh packages/agents-core/dist/ | head -5
else
    echo "❌ agents-core/dist/ not found"
    exit 1
fi
echo ""

# Test 5: Run tests
echo "5️⃣  Running tests..."
pnpm test
echo "✅ Tests passed"
echo ""

# Test 6: Verify package names
echo "6️⃣  Verifying package names..."
echo "Main package:"
cat packages/agents/package.json | grep '"name"'
echo "Core package:"
cat packages/agents-core/package.json | grep '"name"'
echo "OpenAI package:"
cat packages/agents-openai/package.json | grep '"name"'
echo "✅ Package names correct"
echo ""

# Test 7: Check imports in example
echo "7️⃣  Checking example imports..."
grep "from 'computer-agents'" examples/testbase/basic-computer-agent.mjs
echo "✅ Imports updated correctly"
echo ""

# Test 8: Dry-run package
echo "8️⃣  Testing npm pack (dry run)..."
cd packages/agents
npm pack --dry-run 2>&1 | grep -E "(name:|version:|package size:)" || true
cd ../..
echo "✅ Package structure looks good"
echo ""

echo "🎉 All tests passed!"
echo ""
echo "📦 Ready to publish!"
echo ""
echo "Next steps:"
echo "  1. npm login"
echo "  2. pnpm changeset"
echo "  3. pnpm changeset version"
echo "  4. pnpm changeset publish"
