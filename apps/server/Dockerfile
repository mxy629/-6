# 成长星球后端 - 单阶段构建（免费部署优先简单可靠）
FROM node:20-slim

WORKDIR /app

# 先装依赖（利用层缓存）
COPY package*.json ./
RUN npm install

# 复制源码并构建
COPY . .

# 数据库与构建环境
ENV DATABASE_URL=file:./dev.db
RUN npx prisma generate
RUN npx tsc -p tsconfig.docker.json

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# 启动时初始化 SQLite 库再运行服务（免费容器磁盘为临时盘，重启会重建空库）
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && node dist/main.js"]
