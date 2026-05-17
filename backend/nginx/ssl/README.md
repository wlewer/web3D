# Web3D Nginx SSL 证书配置指南

## 目录说明

本目录用于存放 Nginx HTTPS 服务所需的 SSL/TLS 证书文件。

---

## 一、开发环境：自签名证书（快速开始）

在本地开发或测试环境中，可使用自签名证书快速启用 HTTPS。

### 1. 生成自签名证书

在 `backend/nginx/ssl/` 目录下执行：

```bash
# 生成私钥
openssl genrsa -out server.key 2048

# 生成证书签名请求 (CSR)
openssl req -new -key server.key -out server.csr \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=Web3D Dev/CN=localhost"

# 生成自签名证书（有效期 365 天）
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt

# 清理 CSR 文件
rm server.csr
```

### 2. 信任自签名证书（浏览器不再报红）

**Windows:**
1. 双击 `server.crt` → 安装证书
2. 选择"本地计算机" → "将所有的证书都放入下列存储"
3. 选择"受信任的根证书颁发机构"
4. 重启浏览器

**macOS:**
```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain server.crt
```

**Linux (Ubuntu/Debian):**
```bash
sudo cp server.crt /usr/local/share/ca-certificates/web3d-dev.crt
sudo update-ca-certificates
```

### 3. 关键文件

生成后，本目录应包含：
- `server.key` —— 私钥文件（**严格保密，勿提交到 Git**）
- `server.crt` —— 证书文件

> 已在项目 `.gitignore` 中忽略 `*.key` 和 `*.crt` 文件，防止意外提交。

---

## 二、生产环境：Let's Encrypt 免费证书

生产环境推荐使用 [Let's Encrypt](https://letsencrypt.org/) 自动签发和续期受浏览器信任的免费证书。

### 方案 A：Certbot  standalone 模式（推荐用于 Docker 部署）

```bash
# 安装 Certbot
sudo apt-get install certbot

# 停止占用 80 端口的服务，申请证书
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# 证书路径：
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

然后在 `docker-compose.yml` 中将证书目录挂载到 Nginx 容器：

```yaml
volumes:
  - /etc/letsencrypt/live/your-domain.com:/etc/nginx/ssl:ro
  - /etc/letsencrypt:/etc/letsencrypt:ro
```

并修改 `nginx.conf` 中的证书路径：

```nginx
ssl_certificate /etc/nginx/ssl/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/privkey.pem;
```

### 方案 B：Certbot + Nginx 插件（非 Docker 部署）

```bash
sudo apt-get install python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 自动续期

Let's Encrypt 证书有效期为 90 天，需设置自动续期：

```bash
# 测试续期（不实际执行）
sudo certbot renew --dry-run

# 添加定时任务（每天凌晨 2 点检查）
echo "0 2 * * * root certbot renew --quiet --deploy-hook 'docker exec web3d-nginx nginx -s reload'" | sudo tee /etc/cron.d/certbot-renew
```

---

## 三、生产环境：商业证书

如需使用商业证书（如 DigiCert、Sectigo），只需将证书文件和私钥文件放置到本目录，并修改 `nginx.conf` 中的路径即可：

```nginx
ssl_certificate /etc/nginx/ssl/your_domain.crt;
ssl_certificate_key /etc/nginx/ssl/your_domain.key;
```

若证书包含中间证书链，请确保证书文件已合并中间证书，或使用 `ssl_trusted_certificate` 指令单独指定。

---

## 四、安全注意事项

1. **私钥文件 (`*.key`) 绝对不要提交到 Git**
2. 生产环境证书文件权限应设置为 `644`，私钥文件权限设置为 `600`
3. 定期更新证书，避免过期导致服务中断
4. 启用 HSTS 后，如果证书配置错误会导致网站无法访问，请先在开发环境充分测试
