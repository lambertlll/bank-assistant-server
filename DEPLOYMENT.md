# 部署指南

## 环境要求

- 境内云服务器（推荐配置：2核4G，带宽 5M）
- 操作系统：Ubuntu 20.04+ / CentOS 7+
- Docker & Docker Compose
- 域名（可选，用于 HTTPS）

## 推荐云服务商

### 1. 阿里云
- **ECS 云服务器**：¥100/月（2核4G）
- **优势**：稳定、速度快、文档完善
- **购买**：https://www.aliyun.com/product/ecs

### 2. 腾讯云
- **轻量应用服务器**：¥112/月（2核4G）
- **优势**：性价比高、易用
- **购买**：https://cloud.tencent.com/product/lighthouse

### 3. 华为云
- **弹性云服务器**：¥108/月（2核4G）
- **优势**：企业级、安全
- **购买**：https://www.huaweicloud.com/product/ecs.html

---

## 部署步骤

### 第一步：购买并配置服务器

#### 1. 购买服务器
- 选择 **2核4G** 配置
- 选择 **Ubuntu 20.04** 系统
- 选择 **按量付费** 或 **包年包月**
- 配置安全组：开放 **3000** 端口

#### 2. 连接服务器
```bash
ssh root@your-server-ip
```

#### 3. 更新系统
```bash
apt update && apt upgrade -y
```

---

### 第二步：安装 Docker

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 启动 Docker
systemctl start docker
systemctl enable docker

# 安装 Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version
```

---

### 第三步：部署应用

#### 1. 克隆代码
```bash
cd /root
git clone https://github.com/lambertlll/bank-assistant-server.git
cd bank-assistant-server
```

#### 2. 配置环境变量
```bash
cp .env.example .env
nano .env
```

配置内容：
```
PORT=3000
DAILY_LIMIT=100
NODE_ENV=production
```

#### 3. 启动服务
```bash
docker-compose up -d
```

#### 4. 查看日志
```bash
docker-compose logs -f
```

应该看到：
```
🚀 银行助手服务器已启动
📍 地址: http://localhost:3000
```

---

### 第四步：配置防火墙

#### Ubuntu (UFW)
```bash
# 允许 3000 端口
ufw allow 3000/tcp

# 允许 SSH（重要！）
ufw allow 22/tcp

# 启用防火墙
ufw enable
```

#### CentOS (firewalld)
```bash
# 允许 3000 端口
firewall-cmd --permanent --add-port=3000/tcp

# 重载防火墙
firewall-cmd --reload
```

---

### 第五步：测试

```bash
# 健康检查
curl http://localhost:3000/api/health

# 应该返回
{
  "status": "ok",
  "timestamp": "...",
  "dailyLimit": 100,
  "used": 0,
  "remaining": 100,
  "activeTasks": 0
}
```

从外网测试：
```bash
curl http://your-server-ip:3000/api/health
```

---

## 配置域名（可选）

### 1. 购买域名
- 阿里云：https://wanwang.aliyun.com/
- 腾讯云：https://dnspod.cloud.tencent.com/

### 2. 配置 DNS
添加 A 记录：
```
类型: A
主机记录: api
记录值: your-server-ip
TTL: 600
```

### 3. 配置 Nginx 反向代理

#### 安装 Nginx
```bash
apt install nginx -y
```

#### 配置站点
```bash
nano /etc/nginx/sites-available/bank-assistant
```

内容：
```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### 启用站点
```bash
ln -s /etc/nginx/sites-available/bank-assistant /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 4. 配置 HTTPS（推荐）

```bash
# 安装 Certbot
apt install certbot python3-certbot-nginx -y

# 获取证书
certbot --nginx -d api.your-domain.com

# 自动续期
certbot renew --dry-run
```

---

## 维护

### 查看日志
```bash
docker-compose logs -f
```

### 重启服务
```bash
docker-compose restart
```

### 更新代码
```bash
cd /root/bank-assistant-server
git pull
docker-compose down
docker-compose up -d --build
```

### 备份数据
```bash
# 备份 OpenClaw 数据
docker cp bank-assistant:/root/.openclaw /backup/openclaw-$(date +%Y%m%d)
```

---

## 监控

### 1. 使用统计
```bash
curl http://localhost:3000/api/usage
```

### 2. 系统资源
```bash
# CPU 和内存
docker stats bank-assistant

# 磁盘空间
df -h
```

### 3. 日志大小
```bash
du -sh /var/lib/docker/containers/*/
```

---

## 故障排查

### 问题 1：端口被占用
```bash
# 查看端口占用
netstat -tlnp | grep 3000

# 杀死进程
kill -9 <PID>
```

### 问题 2：Docker 容器无法启动
```bash
# 查看日志
docker-compose logs

# 重新构建
docker-compose down
docker-compose up -d --build
```

### 问题 3：OpenClaw 命令未找到
```bash
# 进入容器
docker exec -it bank-assistant bash

# 检查 OpenClaw
which openclaw
openclaw --version

# 如果未安装
npm install -g openclaw
```

---

## 安全建议

### 1. 修改 SSH 端口
```bash
nano /etc/ssh/sshd_config
# Port 22 改为 Port 2222
systemctl restart sshd
```

### 2. 禁用 root 登录
```bash
# 创建普通用户
adduser admin
usermod -aG sudo admin

# 禁用 root
nano /etc/ssh/sshd_config
# PermitRootLogin no
```

### 3. 配置防火墙
```bash
# 只允许必要的端口
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw enable
```

### 4. 定期更新
```bash
# 设置自动更新
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

---

## 成本估算

| 项目 | 成本 |
|------|------|
| 云服务器（2核4G） | ¥100-120/月 |
| 域名（可选） | ¥50-100/年 |
| SSL 证书 | 免费（Let's Encrypt） |
| **总计** | **¥100-120/月** |

---

## 性能优化

### 1. 启用 PM2（可选）
```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start src/server.js --name bank-assistant

# 设置开机自启
pm2 startup
pm2 save
```

### 2. 配置 Redis 缓存（可选）
用于存储任务状态，支持分布式部署。

### 3. 配置 Nginx 缓存
缓存静态资源，减少服务器负载。

---

## 下一步

1. ✅ 购买境内云服务器
2. ✅ 安装 Docker
3. ✅ 部署应用
4. ✅ 配置防火墙
5. ✅ 测试接口
6. ⚠️ 配置域名（可选）
7. ⚠️ 配置 HTTPS（推荐）
