# Publishing Testbase Agents to npm

This guide covers how to publish the testbase-agents SDK to npm.

## Prerequisites

1. **npm account** - Create one at [npmjs.com](https://www.npmjs.com/signup)
2. **npm organization** - Create `@testbase` organization (optional but recommended)
3. **npm authentication** - Login via CLI
4. **Clean working directory** - Commit all changes before publishing

## One-time setup

### 1. Create npm account (if needed)

```bash
# Sign up at https://www.npmjs.com/signup
```

### 2. Create organization (optional)

```bash
# Go to https://www.npmjs.com/org/create
# Create organization named "testbase"
# This allows you to publish @testbase/* packages
```

### 3. Login to npm

```bash
cd testbase-agents
npm login

# Follow prompts:
# Username: your-username
# Password: your-password
# Email: your-email
# OTP: (if 2FA enabled)
```

Verify login:
```bash
npm whoami
# Should show your username
```

## Publishing workflow

We use [Changesets](https://github.com/changesets/changesets) for version management and publishing.

### Step 1: Build everything

```bash
cd testbase-agents

# Clean previous builds
pnpm clean

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

Verify build outputs:
```bash
ls -la packages/agents/dist/
ls -la packages/agents-core/dist/
ls -la packages/agents-openai/dist/
```

### Step 2: Create a changeset

Describe what changed in this release:

```bash
pnpm changeset
```

This will prompt you:
1. **Which packages changed?** - Select the packages to release (usually all)
2. **Bump type** - Choose:
   - `major` - Breaking changes (1.0.0 → 2.0.0)
   - `minor` - New features (1.0.0 → 1.1.0)
   - `patch` - Bug fixes (1.0.0 → 1.0.1)
3. **Summary** - Describe the changes

Example:
```
? Which packages would you like to include?
  ✓ computer-agents
  ✓ computer-agents-core
  ✓ computer-agents-openai

? What kind of change is this for computer-agents?
  › minor

? Please enter a summary for this change:
  › Add CloudRuntime for GCE execution and simplify to two agent types
```

This creates a file in `.changeset/` describing the changes.

### Step 3: Version packages

Apply the changeset to bump versions and update CHANGELOGs:

```bash
pnpm changeset version
```

This will:
- Update package.json versions
- Update CHANGELOG.md files
- Delete the changeset file
- Update workspace dependencies

Review the changes:
```bash
git status
git diff
```

### Step 4: Commit version changes

```bash
git add .
git commit -m "chore: release v0.2.0"
```

### Step 5: Publish to npm

```bash
pnpm changeset publish
```

This will:
- Build all packages (if needed)
- Publish to npm registry
- Create git tags for versions

### Step 6: Push to GitHub

```bash
# Push commits
git push

# Push tags
git push --tags
```

## First-time publish (v0.1.0)

If this is the first time publishing:

```bash
cd testbase-agents

# 1. Make sure you're logged in
npm whoami

# 2. Build everything
pnpm clean
pnpm install
pnpm build

# 3. Create initial changeset
pnpm changeset
# Select: patch or minor
# Summary: "Initial public release"

# 4. Version packages
pnpm changeset version

# 5. Review changes
git diff

# 6. Commit
git add .
git commit -m "chore: prepare initial release v0.1.0"

# 7. Publish!
pnpm changeset publish

# 8. Push
git push
git push --tags
```

## Publishing scripts (optional)

Add these to root `package.json` for convenience:

```json
{
  "scripts": {
    "release": "pnpm build && pnpm changeset publish",
    "version": "pnpm changeset version",
    "changeset": "changeset"
  }
}
```

Then you can just run:
```bash
pnpm changeset      # Create changeset
pnpm version        # Bump versions
pnpm release        # Build and publish
```

## Verify publication

After publishing:

1. **Check npm:**
   ```bash
   npm view computer-agents
   npm view computer-agents-core
   npm view computer-agents-openai
   ```

2. **Test installation:**
   ```bash
   mkdir /tmp/test-install
   cd /tmp/test-install
   npm init -y
   npm install computer-agents
   ```

3. **Check package page:**
   - https://www.npmjs.com/package/computer-agents
   - https://www.npmjs.com/package/computer-agents-core
   - https://www.npmjs.com/package/computer-agents-openai

## Troubleshooting

### "need auth" error

```bash
npm login
```

### "403 Forbidden" error

Make sure:
1. You're logged into npm: `npm whoami`
2. You have access to `@testbase` org (or packages are public)
3. `publishConfig.access = "public"` is in package.json

### "EPUBLISHCONFLICT" error

Version already exists. Bump the version:
```bash
pnpm changeset version
```

### "Module not found" after install

Build before publishing:
```bash
pnpm build
pnpm changeset publish
```

### Wrong files published

Check `files` field in package.json:
```json
{
  "files": ["dist"]
}
```

Test what will be published:
```bash
cd packages/agents
npm pack --dry-run
```

## Version strategy

Follow [Semantic Versioning](https://semver.org/):

**Pre-1.0.0** (current):
- `0.1.x` - Bug fixes and minor features
- `0.x.0` - Significant features (can include breaking changes)

**Post-1.0.0:**
- `x.0.0` (major) - Breaking changes
- `1.x.0` (minor) - New features (backward compatible)
- `1.0.x` (patch) - Bug fixes (backward compatible)

## Checklist before publishing

- [ ] All tests passing (`pnpm test`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Documentation updated (CLAUDE.md, README.md, QUICK_START.md)
- [ ] Examples work with new version
- [ ] CHANGELOG describes changes
- [ ] Version bumped appropriately
- [ ] Logged into npm (`npm whoami`)
- [ ] Clean git working directory

## Post-publish

After publishing a new version:

1. **Update documentation site** (web/hosting)
2. **Announce on GitHub** (create a release)
3. **Update examples** if API changed
4. **Tweet/blog** about new features (optional)

## Advanced: CI/CD publishing

For automated publishing via GitHub Actions, see:
- [Changesets GitHub Action](https://github.com/changesets/action)
- Example workflow in `.github/workflows/release.yml` (to be added)

## Questions?

- **Changesets docs:** https://github.com/changesets/changesets
- **npm publishing:** https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry
- **Semantic Versioning:** https://semver.org/

---

**Ready to publish?** Start with Step 1: Build everything!
