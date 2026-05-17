# M6 DevOps 与 CI/CD 设计文档

> 文档路径：`docs/05-商业化设计/M6-DevOps与CI-CD设计.md`
> 关联模块：所有模块（全局基础设施）

---

## 1. CI/CD 流水线图

```
git push
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  CI 阶段 (GitHub Actions)                                    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │ 代码检出  │→│ 依赖安装   │→│ 单元测试   │→│ 构建产物 │ │
│  │ checkout  │  │ npm/pip   │  │ pytest    │  │ docker   │ │
│  └───────────┘  └───────────┘  └───────────┘  └──────────┘ │
│       │                                               │      │
│       ▼                                               ▼      │
│  ┌───────────┐  ┌───────────┐                  ┌──────────┐ │
│  │ Lint检查  │  │ TypeScript│                  │ 安全扫描 │ │
│  │ eslint    │  │ tsc --noEmit│                │ trivy    │ │
│  │ flake8    │  └───────────┘                  └──────────┘ │
│  └───────────┘                                              │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│  CD 阶段                                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │ Docker    │→│ 推送镜像   │→│ K8s Deploy │→│ 健康检查  │ │
│  │ Build     │  │ Registry  │  │ rollout    │  │ probe    │ │
│  └───────────┘  └───────────┘  └───────────┘  └──────────┘ │
│       │                                               │      │
│       ▼                                               ▼      │
│  ┌───────────┐  ┌───────────┐                  ┌──────────┐ │
│  │ 多阶段构建│  │ 镜像扫描  │                  │ 冒烟测试 │ │
│  │ frontend  │  │ snyk      │                  │ e2e      │ │
│  │ backend   │  └───────────┘                  └──────────┘ │
│  └───────────┘                                              │
└─────────────────────────────────────────────────────────────┘
```

**流水线配置文件：**

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: src/web-frontend/package-lock.json
      - run: cd src/web-frontend && npm ci
      - run: cd src/web-frontend && npm run lint
      - run: cd src/web-frontend && npm run type-check
      - run: cd src/web-frontend && npm run test:unit -- --coverage
      - run: cd src/web-frontend && npm run build

  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: cd backend && pip install -r requirements.txt
      - run: cd backend && pip install -r requirements-dev.txt
      - run: cd backend && flake8 app/
      - run: cd backend && pytest --cov=app --cov-report=xml

  build-and-deploy:
    needs: [test-frontend, test-backend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Build Frontend
        run: |
          cd src/web-frontend
          npm ci
          npm run build
      - name: Build Docker Images
        run: |
          docker build -t web3d/frontend:${{ github.sha }} -f docker/Dockerfile.frontend .
          docker build -t web3d/backend:${{ github.sha }} -f backend/Dockerfile .
          docker build -t web3d/nginx:${{ github.sha }} -f backend/nginx/Dockerfile.nginx .
      - name: Push to Registry
        run: |
          echo ${{ secrets.REGISTRY_PASSWORD }} | docker login registry.web3d.com -u ${{ secrets.REGISTRY_USER }} --password-stdin
          docker push web3d/frontend:${{ github.sha }}
          docker push web3d/backend:${{ github.sha }}
          docker push web3d/nginx:${{ github.sha }}
      - name: Deploy to K8s
        run: |
          kubectl set image deployment/frontend frontend=web3d/frontend:${{ github.sha }}
          kubectl set image deployment/backend backend=web3d/backend:${{ github.sha }}
          kubectl rollout status deployment/frontend
          kubectl rollout status deployment/backend
```

---

## 2. 监控体系架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         数据采集层                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │App Metrics│  │   Logs   │  │ Traces   │  │ 3D Perf      │  │
│  │Prometheus│  │  Loki    │  │ Jaeger   │  │ R3F Profiler │  │
│  │Node Exp  │  │ Promtail │  │ OpenTel  │  │ Custom       │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │             │             │               │            │
└───────┼─────────────┼─────────────┼───────────────┼────────────┘
        │             │             │               │
        ▼             ▼             ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         存储与查询层                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │Prometheus│  │   Loki   │  │  Tempo   │                      │
│  │  TSDB    │  │  Store   │  │  (Traces)│                      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                      │
│       │             │             │                             │
└───────┼─────────────┼─────────────┼─────────────────────────────┘
        │             │             │
        ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         展示与告警层                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Grafana  │  │ AlertMgr │  │  Sentry  │  │  PagerDuty   │  │
│  │ Dashboard│  │ Rules    │  │ Errors   │  │  On-Call     │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Prometheus 抓取配置：**

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'backend-api'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:9113']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:9121']
```

**Loki 日志收集配置：**

```yaml
# promtail.yml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: backend-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: backend
          __path__: /var/log/web3d/backend/*.log

  - job_name: nginx-logs
    static_configs:
      - targets:
          - localhost
        labels:
          job: nginx
          __path__: /var/log/nginx/*.log
```

---

## 3. K8s 部署拓扑

```
┌─────────────────────────────────────────────────────────────┐
│                      K8s Cluster                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Ingress Controller                  │  │
│  │                      (Nginx Ingress)                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                 │
│  ┌────────────────────────┼────────────────────────┐       │
│  │                        │                        │       │
│  ▼                        ▼                        ▼       │
│ ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│ │  frontend   │    │   backend   │    │   nginx     │     │
│ │ Deployment  │    │ Deployment  │    │ Deployment  │     │
│ │ replicas: 3 │    │ replicas: 5 │    │ replicas: 2 │     │
│ └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│        │                  │                  │            │
│  ┌─────┴─────┐      ┌─────┴─────┐      ┌─────┴─────┐    │
│  │  Service  │      │  Service  │      │  Service  │    │
│  │ ClusterIP │      │ ClusterIP │      │ ClusterIP │    │
│  └───────────┘      └───────────┘      └───────────┘    │
│                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Redis     │    │ PostgreSQL  │    │   MinIO     │  │
│  │ StatefulSet │    │ StatefulSet │    │ StatefulSet │  │
│  │ replicas: 3 │    │ replicas: 1 │    │ replicas: 4 │  │
│  └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                         │
│  ┌─────────────┐    ┌─────────────┐                     │
│  │   Celery    │    │ ClickHouse  │                     │
│  │  Worker     │    │ StatefulSet │                     │
│  │ replicas: 5 │    │ replicas: 2 │                     │
│  └─────────────┘    └─────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

**K8s 部署文件示例：**

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: web3d
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
        - name: backend
          image: web3d/backend:latest
          ports:
            - containerPort: 8000
          envFrom:
            - configMapRef:
                name: backend-config
            - secretRef:
                name: backend-secrets
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "2000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /ready
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5
```

---

## 4. 告警规则矩阵

| 规则名称 | 指标 | 阈值 | 持续时间 | 严重程度 | 通知方式 |
|----------|------|------|----------|----------|----------|
| API 错误率过高 | `rate(http_requests_total{status=~"5.."}[5m])` | > 1% | 5m | P1 | PagerDuty + 邮件 |
| API 响应时间 | `histogram_quantile(0.95, http_request_duration_seconds)` | > 2s | 5m | P1 | PagerDuty + 邮件 |
| CPU 使用率 | `node_cpu_usage` | > 80% | 10m | P2 | 邮件 + Slack |
| 内存使用率 | `node_memory_usage` | > 85% | 10m | P2 | 邮件 + Slack |
| 磁盘使用率 | `node_disk_usage` | > 90% | 5m | P2 | 邮件 + Slack |
| Redis 连接数 | `redis_connected_clients` | > 1000 | 5m | P2 | 邮件 |
| DB 连接池 | `postgres_connections_active` | > 80% | 5m | P2 | 邮件 |
| 3D 模型加载失败 | `model_load_failures_total` | > 5/分钟 | 5m | P1 | PagerDuty |
| 支付失败率 | `payment_failures_rate` | > 5% | 10m | P1 | PagerDuty |
| 证书过期 | `ssl_cert_expiry_days` | < 7 | 立即 | P1 | PagerDuty + 邮件 |

```yaml
# prometheus-rules.yml
groups:
  - name: web3d-api
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
        for: 5m
        labels:
          severity: p1
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} for {{ $labels.instance }}"

      - alert: SlowAPIResponse
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: p1
        annotations:
          summary: "Slow API response time"
          description: "95th percentile latency is {{ $value }}s"

      - alert: SSLCertExpiringSoon
        expr: ssl_cert_expiry_days < 7
        for: 0m
        labels:
          severity: p1
        annotations:
          summary: "SSL certificate expiring soon"
          description: "Certificate for {{ $labels.domain }} expires in {{ $value }} days"
```

---

## 5. 蓝绿部署方案

```
当前流量
    │
    ▼
┌─────────────────┐
│   Green 环境    │  ← 当前生产环境
│  (v1.0.0)       │
└─────────────────┘
        │
        │ 发布 v1.1.0
        ▼
┌─────────────────┐
│   Blue 环境     │  ← 部署新版本
│  (v1.1.0)       │     运行健康检查
└─────────────────┘
        │
        │ 健康检查通过
        ▼
    切换流量
        │
   ┌────┴────┐
   ▼         ▼
Green     Blue
(v1.0.0)  (v1.1.0)  ← 流量切换至此
   │         │
   │     观察期（30分钟）
   │         │
   │     回滚？
   │    ┌────┴────┐
   │    ▼         ▼
   │  成功      失败
   │    │         │
   │    ▼         ▼
   │  保留    切回 Green
   │  保留    保留 Blue 排查
```

**K8s 蓝绿部署配置：**

```yaml
# k8s/blue-green-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-active
  namespace: web3d
spec:
  selector:
    app: backend
    version: green  # 切换时改为 blue
  ports:
    - port: 80
      targetPort: 8000
```

---

## 6. 灾备恢复流程

### 6.1 RPO/RTO 目标

| 数据类型 | RPO | RTO | 备份策略 |
|----------|-----|-----|----------|
| PostgreSQL | 1h | 4h | 每小时增量 + 每日全量 |
| Redis | 15min | 1h | AOF 持久化 + 主从复制 |
| MinIO 对象 | 4h | 4h | 跨区域复制 |
| ClickHouse | 24h | 8h | 每日全量备份 |

### 6.2 恢复流程

```
故障检测
    │
    ▼
评估影响范围
    │
    ├── 单点故障（Pod/节点）
    │   └── K8s 自动重启 / 调度
    │
    ├── 数据中心级故障
    │   └── 触发灾备切换
    │
    └── 数据损坏
        └── 启动恢复流程
                │
                ▼
        1. 确认备份可用性
                │
                ▼
        2. 创建隔离恢复环境
                │
                ▼
        3. 恢复数据到指定时间点
                │
                ▼
        4. 数据一致性校验
                │
                ▼
        5. 切换流量到恢复环境
                │
                ▼
        6. 验证业务功能
                │
                ▼
        7. 更新 RPO/RTO 记录
                │
                ▼
        8. 事后复盘与改进
```

**数据库恢复脚本：**

```bash
#!/bin/bash
# scripts/disaster-recovery.sh

# 从 S3 拉取最新备份
aws s3 cp s3://web3d-backups/postgres/latest/ /tmp/restore/ --recursive

# 停止应用写入
kubectl scale deployment backend --replicas=0 -n web3d

# 恢复数据库
pg_restore -h postgres-restore -U admin -d web3d /tmp/restore/backup.dump

# 验证数据一致性
psql -h postgres-restore -U admin -d web3d -c "SELECT count(*) FROM tenants;"

# 切换 DNS 指向恢复环境
# ...

# 恢复应用
kubectl scale deployment backend --replicas=5 -n web3d
```

---

## 附录：关键文件索引

| 文件 | 路径 |
|------|------|
| CI/CD 配置 | `.github/workflows/ci.yml` |
| Docker Compose | `backend/docker-compose.yml` |
| Nginx Docker | `backend/nginx/Dockerfile.nginx` |
| 后端 Dockerfile | `backend/Dockerfile` |
| K8s 部署文件 | `k8s/` (需新建) |
| Prometheus 配置 | `k8s/monitoring/prometheus.yml` |
| Loki 配置 | `k8s/monitoring/loki.yml` |
| 告警规则 | `k8s/monitoring/prometheus-rules.yml` |
| 灾备脚本 | `scripts/disaster-recovery.sh` (需新建) |
