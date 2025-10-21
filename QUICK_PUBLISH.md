# Quick Publish Reference

**TL;DR for publishing testbase-agents to npm**

## First time setup (once)

```bash
# 1. Login to npm
npm login

# Verify
npm whoami
```

## Every release (3 steps)

### 1. Build

```bash
cd testbase-agents
pnpm clean && pnpm install && pnpm build
```

### 2. Version

```bash
# Create changeset
pnpm changeset
# Choose: patch/minor/major
# Describe changes

# Apply changeset
pnpm changeset version

# Commit
git add .
git commit -m "chore: release v0.x.x"
```

### 3. Publish

```bash
# Publish to npm
pnpm changeset publish

# Push to GitHub
git push
git push --tags
```

## Verify

```bash
npm view computer-agents
```

## Quick test

```bash
mkdir /tmp/test && cd /tmp/test
npm init -y
npm install computer-agents
node -e "console.log(require('computer-agents'))"
```

---

**Full guide:** See [PUBLISHING.md](./PUBLISHING.md)
