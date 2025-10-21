# How to Publish Updates to npm

This guide shows you how to publish new versions of computer-agents to npm.

## Quick Publish (Patch/Minor Updates)

For bug fixes and new features:

```bash
cd /Users/jansandmann/testbase/computer-agents

rm -rf packages/agents/dist
rm -rf packages/agents-core/dist
rm -rf packages/agents-openai/dist

pnpm clean

pnpm install

# 1. Make your code changes
# ... edit files ...

# 2. Create a changeset describing your changes
pnpm changeset
# - Select which packages changed
# - Choose: patch (bug fix), minor (new feature), or major (breaking change)
# - Write a summary of changes

# 3. Version the packages (updates package.json and CHANGELOG)
pnpm changeset version

# 4. Build the packages
pnpm build

# 5. Publish to npm
pnpm changeset publish

# 6. Push to git
git add .
git commit -m "chore: release v0.x.x"
git push
git push --tags
```

## Detailed Steps

### 1. Create a Changeset

```bash
pnpm changeset
```

**Prompts:**
- **Which packages?** - Select the packages you changed
- **Bump type?**
  - `patch` - Bug fixes (0.2.0 → 0.2.1)
  - `minor` - New features (0.2.0 → 0.3.0)
  - `major` - Breaking changes (0.2.0 → 1.0.0)
- **Summary** - Describe what changed (shows in CHANGELOG)

**Example:**
```
? Which packages?
  ✓ computer-agents-core
  ✓ computer-agents

? Bump type? minor

? Summary: Add streaming support for CloudRuntime
```

This creates a file in `.changeset/` directory.

### 2. Version Packages

```bash
pnpm changeset version
```

This will:
- Update version numbers in package.json
- Update CHANGELOG.md files
- Delete the changeset file
- Update cross-package dependencies

**Review the changes:**
```bash
git diff
```

### 3. Build

```bash
pnpm build
```

This compiles TypeScript and ensures everything works.

### 4. Publish

```bash
pnpm changeset publish
```

This will:
- Build packages if needed
- Publish to npm registry
- Create git tags

**Note:** Requires npm authentication (`npm login`)

### 5. Push to Git

```bash
git add .
git commit -m "chore: release v0.x.x"
git push
git push --tags
```

## Emergency Republish (Fix Broken Package)

If you published a broken version:

```bash
# 1. Fix the issue
# ... edit files ...

# 2. Create patch changeset
pnpm changeset
# Select packages, choose "patch", describe the fix

# 3. Version
pnpm changeset version

# 4. Build
pnpm build

# 5. Publish
pnpm changeset publish

# 6. Push
git add .
git commit -m "chore: hotfix v0.x.x"
git push
git push --tags
```

## Version Strategy

Follow [Semantic Versioning](https://semver.org/):

**Before 1.0.0:**
- `patch` (0.2.0 → 0.2.1) - Bug fixes
- `minor` (0.2.0 → 0.3.0) - New features (can include small breaking changes)
- `major` (0.x.x → 1.0.0) - When API is stable

**After 1.0.0:**
- `patch` (1.0.0 → 1.0.1) - Bug fixes only
- `minor` (1.0.0 → 1.1.0) - New features (backward compatible)
- `major` (1.0.0 → 2.0.0) - Breaking changes

## Pre-Publish Checklist

Before running `pnpm changeset publish`:

- [ ] All code changes committed
- [ ] Tests passing (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Logged into npm (`npm whoami`)
- [ ] Changeset created and versioned
- [ ] CHANGELOG looks correct

## Common Issues

### "need auth" error

```bash
npm login
```

### "already published" error

You tried to publish the same version twice. Create a new changeset:

```bash
pnpm changeset
pnpm changeset version
pnpm changeset publish
```

### Workspace dependencies not resolving

```bash
pnpm install
pnpm build
pnpm changeset publish
```

### Published package is broken

Publish a patch fix immediately:

```bash
# Fix the code
pnpm changeset  # Choose "patch"
pnpm changeset version
pnpm build
pnpm changeset publish
```

## Verify Publication

After publishing:

```bash
# Check npm
npm view computer-agents
npm view computer-agents-core
npm view computer-agents-openai

# Test installation
mkdir /tmp/test-latest
cd /tmp/test-latest
npm init -y
npm install computer-agents
node -e "const {Agent} = require('computer-agents'); console.log('Works!', typeof Agent)"
```

## What Gets Published

Only these files are published to npm:

- `dist/` - Compiled JavaScript and TypeScript definitions
- `package.json` - Package metadata
- `README.md` - Package documentation
- `LICENSE` - MIT License

**Not published:**
- Source code (`src/`)
- Tests
- Examples
- Configuration files
- Documentation (except README.md)

## Package Structure

```
computer-agents/
├── dist/           ← Published
│   ├── index.js
│   ├── index.d.ts
│   └── ...
├── package.json    ← Published
├── README.md       ← Published
└── LICENSE         ← Published
```

## Advanced: Prerelease Versions

For beta/alpha releases:

```bash
# Create a prerelease changeset
pnpm changeset --snapshot beta

# Publish as beta
pnpm changeset version --snapshot beta
pnpm build
pnpm changeset publish --tag beta
```

Users install with:
```bash
npm install computer-agents@beta
```

## Questions?

- **Changesets docs:** https://github.com/changesets/changesets
- **npm publishing:** https://docs.npmjs.com/packages-and-modules
- **Semantic Versioning:** https://semver.org/

---

**Last updated:** After fixing v0.2.0 broken imports
