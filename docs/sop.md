# 代码更新 SOP（标准操作流程）

每次代码更新后，按以下流程执行，确保质量一致。

## 流程

### 1. 代码修改
- 完成功能开发或 bug 修复
- 确保代码风格与现有代码一致

### 2. 运行测试
```bash
cd server
node tests/test-api.js
```
- 所有测试必须通过（当前 48 个用例）
- 如果新增 API 端点，必须添加对应测试

### 3. 更新文档
根据修改内容，更新以下文档（按需）：

| 变更类型 | 需要更新的文档 |
|---------|--------------|
| 新增 API 端点 | `docs/api-reference.md` |
| 功能变更 | `docs/changelog.md` |
| 部署相关变更 | `docs/deployment.md` |
| 项目结构变更 | `docs/README.md` |
| 新经验/教训 | `docs/experience.md` |

### 4. Git 提交推送
```bash
git add -A
git commit -m "类型: 简要描述"
git push origin main
```

Commit 类型：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建/工具

### 5. 部署到服务器
```bash
# 上传更新的文件
scp -r server/ root@139.199.73.159:/opt/monitor/
scp frontend/index.html root@139.199.73.159:/opt/monitor/frontend/
scp sdk/tracker.js root@139.199.73.159:/opt/monitor/sdk/

# 重启服务
ssh root@139.199.73.159 "cd /opt/monitor/server && pm2 restart monitor"
```

### 6. 验证线上功能
```bash
# 健康检查
curl http://139.199.73.159/healthz

# 打开看板
# http://139.199.73.159/index.html
```

## 注意事项

- 不要提交 `.env`、`node_modules`、`data/*.db`
- 敏感信息（密码、IP）不要写入文档
- 部署前确认测试全部通过
- 大改动建议先在本地完整测试再部署
