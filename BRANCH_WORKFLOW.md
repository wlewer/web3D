# Git 分支管理工作流

## 分支结构

```
master (生产环境 - 稳定版本)
  ↑ 仅接受来自 dev 的合并
dev (开发主分支 - 日常集成)
  ↑ 功能分支合并目标
feature/xxx (功能开发分支)
hotfix/xxx (紧急修复分支)
```

## 分支职责

### `master` 分支
- **用途**: 生产环境代码，对外发布的稳定版本
- **保护规则**:
  - ❌ 禁止直接 push
  - ✅ 只能通过 Pull Request/Merge Request 从 dev 合并
  - ✅ 每次合并必须打 tag (如 v1.0.0)
- **谁可以合并**: 项目负责人

### `dev` 分支
- **用途**: 开发主分支，所有功能开发的集成地
- **保护规则**:
  - ❌ 禁止 force push (`git push --force`)
  - ✅ 允许正常 push
  - ✅ 功能分支通过 PR/MR 合并进来
- **谁可以提交**: 所有开发者

### `feature/xxx` 分支
- **用途**: 功能开发分支，每个新功能一个分支
- **命名规范**: `feature/<功能名称>`
  - 示例: `feature/model-preview`, `feature/user-auth`
- **生命周期**: 从 dev 切出 → 开发完成 → 合并回 dev → 删除
- **谁可以提交**: 分支创建者

### `hotfix/xxx` 分支
- **用途**: 紧急修复生产环境 bug
- **命名规范**: `hotfix/<问题描述>`
  - 示例: `hotfix/login-crash`, `hotfix/api-timeout`
- **来源**: 从 master 切出
- **合并目标**: 同时合并到 master 和 dev
- **谁可以提交**: 任何人（需代码审查）

---

## 工作流程

### 1. 日常功能开发

```bash
# 步骤1: 切换到 dev 并拉取最新代码
git checkout dev
git pull origin dev

# 步骤2: 创建功能分支
git checkout -b feature/your-feature-name

# 步骤3: 开发并提交代码
git add .
git commit -m "feat: 添加模型预览功能"

# 步骤4: 推送到远程
git push origin feature/your-feature-name

# 步骤5: 在 Gitee/GitHub 创建 Pull Request
# 访问: https://gitee.com/kk357924266/web3D/pulls
# 源分支: feature/your-feature-name
# 目标分支: dev

# 步骤6: 等待代码审查通过后合并
```

### 2. 发布到生产环境

```bash
# 当 dev 分支功能稳定后，负责人执行：

# 步骤1: 切换到 master
git checkout master
git pull origin master

# 步骤2: 合并 dev 分支
git merge dev

# 步骤3: 推送并打标签
git push origin master
git tag v1.0.0
git push origin v1.0.0

# 步骤4: 同步到所有远程仓库
git push github master
git push github v1.0.0
```

### 3. 紧急修复流程

```bash
# 步骤1: 从 master 创建 hotfix 分支
git checkout master
git pull origin master
git checkout -b hotfix/critical-bug-fix

# 步骤2: 修复 bug 并提交
git add .
git commit -m "fix: 修复登录崩溃问题"

# 步骤3: 合并到 master
git checkout master
git merge hotfix/critical-bug-fix
git push origin master
git push github master

# 步骤4: 同步到 dev (避免后续冲突)
git checkout dev
git merge hotfix/critical-bug-fix
git push origin dev
git push github dev

# 步骤5: 删除 hotfix 分支
git branch -d hotfix/critical-bug-fix
git push origin --delete hotfix/critical-bug-fix
```

---

## 提交信息规范

采用 **Conventional Commits** 标准：

### 格式

```
<type>: <description>

[optional body]

[optional footer]
```

### Type 类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 添加模型3D预览功能` |
| `fix` | 修复 bug | `fix: 修复相机控制卡顿问题` |
| `docs` | 文档更新 | `docs: 更新API接口文档` |
| `style` | 代码格式（不影响功能） | `style: 格式化代码缩进` |
| `refactor` | 重构代码 | `refactor: 重构用户认证逻辑` |
| `test` | 测试相关 | `test: 添加用户登录单元测试` |
| `chore` | 构建工具/依赖更新 | `chore: 升级 React 到 v18` |

### 完整示例

```bash
# 简单提交
git commit -m "feat: 添加模型上传功能"

# 带详细描述
git commit -m "fix: 修复相机控制卡顿问题

- 优化相机移动插值算法
- 移除不必要的渲染循环
- 降低鼠标灵敏度阈值

Closes #123"

# 带 footer
git commit -m "feat: 实现用户权限管理

BREAKING CHANGE: 权限系统 API 已变更，需要更新前端调用"
```

---

## 多人协作最佳实践

### 1. 每日开始前同步代码

```bash
# 每天早上开始工作前
git checkout dev
git pull origin dev

# 如果正在功能分支上
git checkout feature/your-feature
git rebase dev  # 或者 git merge dev
```

### 2. 避免冲突的技巧

- **频繁同步**: 每天至少 pull 一次 dev 分支
- **小步提交**: 不要积累太多代码再提交
- **明确分工**: 团队成员避免修改同一文件
- **及时沟通**: 修改公共模块前先通知团队

### 3. 处理冲突

```bash
# 当合并出现冲突时
git status  # 查看冲突文件

# 手动解决冲突（编辑文件）
# 然后标记为已解决
git add <conflicted-file>

# 继续合并
git commit -m "merge: 解决与 dev 的冲突"
```

### 4. 代码审查清单

创建 Pull Request 时自查：
- [ ] 代码能正常运行
- [ ] 已通过本地测试
- [ ] 无 console.log 调试代码
- [ ] 无敏感信息（密码、密钥）
- [ ] 提交信息清晰
- [ ] 更新了相关文档

---

## Gitee/GitHub 配置建议

### 分支保护规则（需在网页端配置）

#### master 分支保护
1. 进入仓库 → 设置 → 分支保护
2. 添加规则: `master`
3. 勾选:
   - ✅ 禁止强制推送
   - ✅ 禁止删除分支
   - ✅ 需要 Pull Request 才能合并
   - ✅ 至少 1 人审查通过
   - ✅ 需要状态检查通过（可选）

#### dev 分支保护
1. 添加规则: `dev`
2. 勾选:
   - ✅ 禁止强制推送
   - ✅ 禁止删除分支
   - ⚠️ 可选择是否要求 PR（小团队可直接 push）

### 远程仓库同步

当前项目配置了两个远程仓库：

```bash
# 查看远程仓库
git remote -v

# 输出:
# origin  https://gitee.com/kk357924266/web3D.git (fetch/push)
# github  https://github.com/wlewer/web3D.git (fetch/push)

# 推送到两个仓库
git push origin dev
git push github dev
```

**建议**: 以 Gitee 为主仓库，GitHub 为镜像备份。

---

## 常见问题

### Q1: 不小心直接 push 到 master 怎么办？

```bash
# 立即回退（仅限未推送到远程）
git reset --hard HEAD~1

# 如果已推送到远程，联系管理员恢复
```

### Q2: 如何撤销已 push 的提交？

```bash
# 使用 revert（安全，保留历史）
git revert <commit-hash>
git push origin dev

# 不要使用 reset --hard 推送到共享分支！
```

### Q3: dev 和 master 差异太大怎么办？

```bash
# 定期将 master 合并到 dev（保持同步）
git checkout dev
git merge master
git push origin dev
```

### Q4: 如何查看分支状态？

```bash
# 查看所有分支
git branch -a

# 查看当前分支与远程的差异
git status

# 查看提交历史
git log --oneline --graph --all
```

---

## 快速参考

```bash
# 开始新功能
git checkout dev && git pull origin dev
git checkout -b feature/new-feature

# 提交代码
git add .
git commit -m "feat: 描述你的改动"
git push origin feature/new-feature

# 创建 PR 后等待审查合并

# 同步最新代码
git checkout dev && git pull origin dev
git checkout feature/new-feature && git merge dev
```

---

**最后更新**: 2026-05-21
**维护者**: Web3D 团队
