# 1) Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# 生产变量可通过构建时 --build-arg 注入，也可 runtime 时用 Nginx 层配置
RUN npm run build

# 2) Nginx runtime
FROM nginx:1.25-alpine
# 静态文件
COPY --from=builder /app/dist /usr/share/nginx/html
# 覆盖默认配置，加入反向代理与 WS 升级
COPY ./deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]