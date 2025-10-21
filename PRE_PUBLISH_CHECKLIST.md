# Pre-Publish Checklist for computer-agents

## ✅ Completed Items

### Package Metadata
- ✅ All three packages renamed correctly:
  - `computer-agents` (main package)
  - `computer-agents-core` (core implementation)
  - `computer-agents-openai` (OpenAI integration)
- ✅ Repository URLs updated to `https://github.com/testbasehq/computer-agents`
- ✅ All packages have `publishConfig.access = "public"`
- ✅ All packages have `files: ["dist"]` to publish only built code
- ✅ Good descriptions and keywords
- ✅ MIT License specified

### Documentation
- ✅ Created brand new `packages/agents/README.md` for npm package page
- ✅ Updated root `README.md` with all correct package names
- ✅ Replaced all `@testbase/agents` → `computer-agents` import references
- ✅ Updated logger namespaces from `testbase-agents` → `computer-agents`

### Source Code
- ✅ Fixed all TypeScript imports from `@testbase/agents-core` → `computer-agents-core`
- ✅ Updated `tsconfig.json` path mappings
- ✅ Updated `tsconfig.test.json` path mappings
- ✅ Build succeeds (`pnpm build` ✓)

### Build Configuration
- ✅ `.npmignore` or `files` field configured correctly
- ✅ TypeScript compilation working
- ✅ Dist folders will be published

## ⚠️ Items Needing Attention

### 1. Version Consistency
**Issue:** `computer-agents-openai` is at version `0.1.9` while others are at `0.1.0`

**Recommendation:** When you run `pnpm changeset version`, all packages will be bumped together. This will fix the inconsistency.

**Action:** No action needed - changesets will handle this.

### 2. LICENSE File
**Current:** License says "Copyright (c) 2025 OpenAI"

**Question:** Should this be:
- Option A: Keep "OpenAI" (since it's derived from OpenAI Agents SDK)
- Option B: Change to "Testbase" or your organization
- Option C: Dual copyright: "OpenAI and Testbase"

**Recommendation:** Decide before publishing. If you're keeping it OpenAI, no change needed.

### 3. Documentation Files with Old References
**Status:** Several .md files in the repo still reference `testbase-agents` or `@testbase/agents`

**Files affected:**
- `TESTING.md`
- `RENAME_COMPLETE.md`
- `QUICK_PUBLISH.md`
- `PUBLISHING.md`
- `QUICK_START.md`
- Various summary/migration docs
- `examples/testbase/*.md` files
- `packages/cloud-infrastructure/*.md` files

**Impact:** LOW - These files are NOT published to npm (only `dist/` folder is published)

**Recommendation:**
- CRITICAL: None (npm package will be clean)
- NICE TO HAVE: Update these if you plan to push to GitHub
- If GitHub is not a priority, you can publish now and clean up docs later

### 4. Examples Directory
**Status:** Examples in `examples/testbase/` still use old imports

**Impact:** LOW - Not published to npm

**Recommendation:** Update examples if you want them to work post-rename, but NOT required for npm publish.

## 📋 Pre-Publish Checklist

Before running `pnpm changeset publish`, verify:

- [x] Build succeeds: `pnpm build`
- [ ] Tests pass: `pnpm test`
- [x] Package names correct in all `package.json` files
- [x] Main package README is professional and clear
- [x] Root README updated with new package names
- [ ] Logged into npm: `npm whoami`
- [ ] LICENSE file copyright acceptable
- [ ] Ready to make package public

## 🚀 Publishing Steps

### Option 1: Quick Publish (Recommended)

If everything above looks good:

```bash
cd /Users/jansandmann/testbase/computer-agents

# 1. Verify npm login
npm whoami

# 2. Create changeset
pnpm changeset
# Select all packages, choose "minor", describe as "Initial release as computer-agents"

# 3. Version packages
pnpm changeset version
# This will sync all versions to 0.2.0 (or whatever you choose)

# 4. Build
pnpm build

# 5. Publish!
pnpm changeset publish

# 6. Push to git
git add .
git commit -m "chore: publish computer-agents to npm"
git push
git push --tags
```

### Option 2: Conservative Publish

If you want to be extra careful:

```bash
# 1. Test package contents
cd packages/agents
npm pack --dry-run
# Review the file list - should only show dist/ files

# 2. Test in another directory
mkdir /tmp/test-computer-agents
cd /tmp/test-computer-agents
npm init -y
npm install /Users/jansandmann/testbase/computer-agents/packages/agents
node -e "const {Agent} = require('computer-agents'); console.log('Works!', Agent)"

# 3. Then proceed with Option 1 steps
```

## 📊 What Gets Published

### Published to npm (✅ CLEAN):
```
computer-agents/
├── dist/
│   ├── index.js
│   ├── index.d.ts
│   └── ... (all compiled files)
├── package.json
├── README.md  (your new professional README)
└── LICENSE

computer-agents-core/
├── dist/
│   └── ... (all compiled files)
├── package.json
└── LICENSE

computer-agents-openai/
├── dist/
│   └── ... (all compiled files)
├── package.json
└── LICENSE
```

### NOT Published (✓):
- Source code (`src/`)
- Tests
- Examples
- Documentation files (except package README.md)
- node_modules
- Build configs

## ✨ Summary

**READY TO PUBLISH:** Yes! ✅

The packages are professionally configured and ready for npm. The main items needing your decision:

1. **LICENSE copyright** - Decide if "OpenAI" is okay
2. **Run tests** - Make sure `pnpm test` passes
3. **npm login** - Ensure you're logged in

After those three items, you're good to publish! The packages will look professional on npm with:
- Clean, focused README
- Proper metadata
- Only distributable code
- Correct package names
- Public access configured

**Estimated time to publish:** 5-10 minutes

---

**Questions?** See `PUBLISHING.md` for detailed publishing guide.
