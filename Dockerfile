FROM node:22-alpine

# 安装必要的工具
RUN apk add --no-cache bash curl git

# 设置工作目录
WORKDIR /app

# 复制 package.json
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 全局安装 OpenClaw
RUN npm install -g openclaw@latest

# 复制代码
COPY . .

# 创建 OpenClaw workspace 和配置
RUN mkdir -p /root/.openclaw/workspace/skills && \
    cp -r skills/* /root/.openclaw/workspace/skills/ 2>/dev/null || true

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", "src/server.js"]
