# Testing Guide After Rename

Quick guide to test that the rename from `testbase-agents` to `computer-agents` worked correctly.

## 🚀 Quick Test (Automated)

Run the test script:

```bash
cd /Users/jansandmann/testbase/computer-agents
chmod +x test-rename.sh
./test-rename.sh
```

This will:
- Clean build artifacts
- Install dependencies
- Build all packages
- Run tests
- Verify package names
- Check imports
- Validate package structure

## 🧪 Manual Tests

### 1. Clean Build Test

```bash
cd computer-agents

# Clean
pnpm clean

# Install
pnpm install

# Build
pnpm build

# Check output
ls -la packages/agents-core/dist/
```

**Expected:** Build succeeds, `dist/` folder contains compiled files.

### 2. Package Name Test

```bash
# Check main package
cat packages/agents/package.json | grep '"name"'
# Should show: "name": "computer-agents"

# Check core package
cat packages/agents-core/package.json | grep '"name"'
# Should show: "name": "computer-agents-core"

# Check openai package
cat packages/agents-openai/package.json | grep '"name"'
# Should show: "name": "computer-agents-openai"
```

**Expected:** All three packages show `computer-agents*` names.

### 3. Import Test

```bash
# Check example imports
grep "from" examples/testbase/basic-computer-agent.mjs
```

**Expected:** `import { Agent, run, LocalRuntime } from 'computer-agents';`

### 4. Unit Tests

```bash
pnpm test
```

**Expected:** All tests pass.

### 5. Example Test (Local)

```bash
# Make sure OPENAI_API_KEY is set
export OPENAI_API_KEY=sk-...

# Run basic example
node examples/testbase/basic-computer-agent.mjs
```

**Expected:**
- Creates workspace in `./tmp/basic-demo`
- Executes task successfully
- Shows session ID

### 6. Package Structure Test

```bash
cd packages/agents

# See what would be published
npm pack --dry-run

# Should show:
# - name: computer-agents
# - Files: dist/index.js, dist/index.d.ts, etc.
```

**Expected:** Only `dist/` folder is included, no source files.

### 7. Dependency Resolution Test

```bash
# Check workspace dependencies resolve correctly
pnpm list --depth 0
```

**Expected:** No errors about missing workspace packages.

### 8. TypeScript Compilation Test

```bash
# Check TypeScript compiles without errors
cd packages/agents-core
pnpm build-check
```

**Expected:** No TypeScript errors.

## ✅ Success Criteria

All these should be true:

- [x] `pnpm build` succeeds
- [x] `pnpm test` passes
- [x] Package names are `computer-agents*`
- [x] Example imports use `computer-agents`
- [x] Dist folders contain compiled files
- [x] No TypeScript errors
- [x] Examples run successfully

## 🐛 Common Issues

### "Cannot find module 'computer-agents'"

**Cause:** Workspace dependencies not resolved.

**Fix:**
```bash
pnpm install
```

### "Runtime required for computer agents"

**Cause:** Example running but this is expected error if no workspace provided.

**Fix:** This is normal - examples create their own workspace.

### Build fails with "Cannot find 'computer-agents-core'"

**Cause:** Workspace dependency not found.

**Fix:**
```bash
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### Import errors in TypeScript

**Cause:** Old build artifacts.

**Fix:**
```bash
pnpm clean
pnpm build
```

## 📊 What Changed vs What Didn't

### ✅ Changed (should be different)

- Package names in `package.json` files
- Import statements in examples
- Documentation references
- Repository URLs

### ❌ Not Changed (should be the same)

- Source code logic
- File structure (except directory name)
- Dependencies (versions)
- TypeScript config
- Build output structure

## 🎯 Pre-Publish Checklist

Before publishing to npm:

- [ ] All tests pass (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Examples work (`node examples/testbase/basic-computer-agent.mjs`)
- [ ] Package names are correct (all three packages)
- [ ] No TypeScript errors
- [ ] Logged into npm (`npm whoami`)

## 🚀 Ready to Publish?

If all tests pass:

```bash
# 1. Create changeset
pnpm changeset
# Choose: minor
# Summary: "Initial release as computer-agents"

# 2. Version packages
pnpm changeset version

# 3. Build
pnpm build

# 4. Publish
pnpm changeset publish

# 5. Push tags
git push --tags
```

---

**Need help?** See `PUBLISHING.md` for detailed publishing instructions.
