---
trigger: always_on
---
# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## 5. Git Branch Management Rules (Mandatory)

**Core Principle: Team members commit to dev branch. Merge to master only when version is stable.**

### Branch Responsibilities

| Branch | Purpose | Protection Rules | Who Can Commit |
|--------|---------|-----------------|----------------|
| `master` | **Production environment**, only accepts stable versions from dev | ❌ No direct push, must use PR/MR | Project lead only |
| `dev` | **Development main branch**, daily integration | ❌ No force push | All developers |
| `feature/xxx` | **Feature branches**, e.g., feature/model-preview | No restrictions | Branch creator |
| `hotfix/xxx` | **Hotfix branches**, cut directly from master | No restrictions | Anyone (requires approval) |

### Standard Workflow

#### Daily Development (Team Members)

```bash
# Step 1: Create feature branch from dev
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name

# Step 2: Develop and commit on feature branch
git add .
git commit -m "feat: add model preview feature"

# Step 3: Push to remote (Gitee is primary)
git push origin feature/your-feature-name

# Step 4: Create Pull Request on Gitee
# Target: feature/xxx → dev
# Visit: https://gitee.com/kk357924266/web3D/pulls

# Step 5: Merge to dev after code review
```

#### Release to Production (Project Lead)

```bash
# When dev branch is stable, merge to master
git checkout master
git pull origin master
git merge dev
git push origin master

# Tag the version
git tag v1.0.0
git push origin v1.0.0
```

#### Hotfix Workflow

```bash
# Create hotfix branch from master
git checkout master
git checkout -b hotfix/critical-bug-fix

# After fixing, merge to both master and dev
git checkout master
git merge hotfix/critical-bug-fix
git push origin master

git checkout dev
git merge hotfix/critical-bug-fix
git push origin dev
```

### Commit Message Convention

Use **Conventional Commits** format:

```
<type>: <description>
```

**Type options:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation update
- `style`: Code formatting (no functional change)
- `refactor`: Code refactoring
- `test`: Test related
- `chore`: Build tool/dependency update

**Examples:**
```bash
git commit -m "feat: add 3D model preview feature"
git commit -m "fix: resolve camera control lag issue"
git commit -m "docs: update API documentation"
```

### Important Reminders

1. **Never push directly to master**
   - ❌ Wrong: `git checkout master && git push`
   - ✅ Correct: Merge from dev via PR/MR

2. **Sync code before starting work**
   ```bash
   git checkout dev && git pull origin dev
   ```

3. **Avoid conflicts**
   - Sync frequently: pull dev at least once daily
   - Small commits: don't accumulate too many changes
   - Clear division: avoid modifying same files

4. **Remote repository setup**
   - `origin` → Gitee (primary)
   - `github` → GitHub (mirror backup)
   - Script handles dual-platform sync automatically

### Automation Script

Project provides branch management script:

```powershell
# Windows PowerShell
.\scripts\git-branch-manager.ps1 start feature/xxx    # Create feature branch
.\scripts\git-branch-manager.ps1 publish               # Push to remote
.\scripts\git-branch-manager.ps1 sync                  # Sync dev code
.\scripts\git-branch-manager.ps1 merge-dev             # Merge to dev
.\scripts\git-branch-manager.ps1 release               # Release to master (lead)
.\scripts\git-branch-manager.ps1 hotfix xxx            # Create hotfix branch
```

Full documentation: [`BRANCH_WORKFLOW.md`](../BRANCH_WORKFLOW.md)
