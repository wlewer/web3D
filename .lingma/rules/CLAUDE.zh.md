---
trigger: always_on
---
# CLAUDE.md

用于减少常见 LLM 编码错误的行为准则。可按需与项目特定指令合并使用。

**权衡：** 这些准则更偏向谨慎而不是速度。对于琐碎任务，请自行判断。

## 1. 编码前先思考

**不要假设。不要掩饰困惑。明确呈现权衡。**

在实现之前：
- 明确写出你的假设。如果不确定，就提问。
- 如果存在多种解释，先把它们列出来，不要默默自行选择。
- 如果有更简单的方法，就直接指出来。在有必要时提出异议。
- 如果有不清楚的地方，就停下来。说清楚困惑点，并提问。

## 2. 简单优先

**只写解决问题所需的最少代码。不做任何预设性扩展。**

- 不要加入超出需求范围的功能。
- 不要为一次性代码做抽象。
- 不要加入未被要求的"灵活性"或"可配置性"。
- 不要为不可能发生的场景写错误处理。
- 如果你写了 200 行，但 50 行就够，就重写。

问问自己："一个资深工程师会认为这太复杂了吗？" 如果答案是会，那就继续简化。

## 3. 外科手术式修改

**只改必须改的内容。只清理你自己造成的问题。**

编辑现有代码时：
- 不要"顺手优化"相邻代码、注释或格式。
- 不要重构没有坏掉的部分。
- 保持现有风格，即使你个人会写成别的样子。
- 如果发现无关的死代码，可以指出，但不要删除。

当你的改动产生遗留项时：
- 删除那些因你的修改而变成未使用的 import、变量或函数。
- 不要删除原本就存在的死代码，除非被明确要求。

检验标准：每一行改动都应当能直接追溯到用户请求。

## 4. 目标驱动执行

**先定义成功标准，再循环推进，直到验证通过。**

把任务转换成可验证的目标：
- "添加校验" → "先为非法输入写测试，再让测试通过"
- "修复这个 bug" → "先写能复现它的测试，再让测试通过"
- "重构 X" → "确保改动前后测试都通过"

对于多步骤任务，先给出简短计划：
```
1. [步骤] → 验证：[检查项]
2. [步骤] → 验证：[检查项]
3. [步骤] → 验证：[检查项]
```

强有力的成功标准能让你独立闭环推进。弱成功标准（"把它弄好"）则会不断需要额外澄清。

---

**如果这些准则正在发挥作用，你会看到：** diff 中不必要的改动更少，因为过度复杂而返工的次数更少，而且澄清性问题会出现在实现之前，而不是出错之后。

---

## 5. Git 分支管理规范（强制遵守）

**核心原则：团队协作统一提交到 dev 分支，版本稳定后再合并到 master。**

### 分支职责定义

| 分支 | 用途 | 保护规则 | 谁可以提交 |
|------|------|---------|-----------|
| `master` | **生产环境**，只接受来自 dev 的稳定版本 | ❌ 禁止直接 push，必须通过 PR/MR | 仅项目负责人 |
| `dev` | **开发主分支**，日常开发集成地 | ❌ 禁止 force push | 所有开发者 |
| `feature/xxx` | **功能分支**，如 feature/model-preview | 无限制 | 分支创建者 |
| `hotfix/xxx` | **紧急修复分支**，直接从 master 切出 | 无限制 | 任何人（需审批） |

### 标准工作流程

#### 日常开发流程（团队成员）

```bash
# 步骤1: 从 dev 创建功能分支
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name

# 步骤2: 在功能分支上开发、提交
git add .
git commit -m "feat: 添加模型预览功能"

# 步骤3: 推送到远程（Gitee 为主仓库）
git push origin feature/your-feature-name

# 步骤4: 在 Gitee 上创建 Pull Request
# 目标: feature/xxx → dev
# 访问: https://gitee.com/kk357924266/web3D/pulls

# 步骤5: 代码审查通过后合并到 dev
```

#### 发布到生产环境（项目负责人）

```bash
# 当 dev 分支功能稳定后，合并到 master
git checkout master
git pull origin master
git merge dev
git push origin master

# 打标签标记版本
git tag v1.0.0
git push origin v1.0.0
```

#### 紧急修复流程

```bash
# 从 master 创建 hotfix 分支
git checkout master
git checkout -b hotfix/critical-bug-fix

# 修复后同时合并到 master 和 dev
git checkout master
git merge hotfix/critical-bug-fix
git push origin master

git checkout dev
git merge hotfix/critical-bug-fix
git push origin dev
```

### 提交信息规范

采用 **Conventional Commits** 规范：

```
<type>: <description>
```

**Type 类型：**
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建工具/依赖更新

**示例：**
```bash
git commit -m "feat: 添加模型3D预览功能"
git commit -m "fix: 修复相机控制卡顿问题"
git commit -m "docs: 更新API接口文档"
```

### 重要提醒

1. **永远不要直接 push 到 master**
   - ❌ 错误：`git checkout master && git push`
   - ✅ 正确：通过 PR/MR 从 dev 合并

2. **每日开始前同步代码**
   ```bash
   git checkout dev && git pull origin dev
   ```

3. **避免冲突的技巧**
   - 频繁同步：每天至少 pull 一次 dev 分支
   - 小步提交：不要积累太多代码再提交
   - 明确分工：团队成员避免修改同一文件

4. **远程仓库配置**
   - `origin` → Gitee（主仓库）
   - `github` → GitHub（镜像备份）
   - 脚本已自动处理双平台同步

### 自动化脚本

项目提供分支管理脚本简化操作：

```powershell
# Windows PowerShell
.\scripts\git-branch-manager.ps1 start feature/xxx    # 创建功能分支
.\scripts\git-branch-manager.ps1 publish               # 推送到远程
.\scripts\git-branch-manager.ps1 sync                  # 同步 dev 代码
.\scripts\git-branch-manager.ps1 merge-dev             # 合并到 dev
.\scripts\git-branch-manager.ps1 release               # 发布到 master（负责人）
.\scripts\git-branch-manager.ps1 hotfix xxx            # 创建紧急修复分支
```

详细文档请查看：[`BRANCH_WORKFLOW.md`](../BRANCH_WORKFLOW.md)
