# Yusic-server
# Yusic-server 部署文档

适用于 Linux / Ubuntu 系统，Node + pnpm + PM2 的完整部署流程。

---

## 0️⃣ 准备 Node 环境（如果没装）

```bash
apt update && apt install -y curl build-essential
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.6/install.sh | bash
source ~/.bashrc
nvm install --lts
node -v
npm -v
```

---

## 1️⃣ 安装 pnpm（项目依赖管理器）

```bash
npm install -g pnpm
pnpm -v
```

---

## 2️⃣ 安装 PM2（进程守护工具）

```bash
npm install -g pm2
pm2 -v
```

---

## 3️⃣ 拉取项目代码

```bash
cd ~
git clone https://github.com/zwl098/Yusic-server.git
cd Yusic-server
```

> 如果以后更新代码，只需：

```bash
git pull
```

---

## 4️⃣ 安装项目依赖

```bash
pnpm install
```

---

## 5️⃣ 构建 TypeScript（生成 dist 文件夹）

```bash
pnpm build
```

> 注意：根据项目 package.json，build 脚本名称可能不同。

---

## 6️⃣ 启动项目（第一次运行）

```bash
pnpm start
```

或直接用 Node 启动 dist 文件夹：

```bash
node dist/index.js
```

---

## 7️⃣ 用 PM2 守护运行（推荐生产用）

```bash
# 方式 A：直接用 dist 文件
pm2 start dist/index.js --name yusic

# 方式 B：如果 package.json 有 start 脚本
pm2 start pnpm --name yusic -- start
```

---

## 8️⃣ 设置 PM2 开机自启

```bash
pm2 startup
# 系统会输出一行命令，复制执行，例如：
# sudo env PATH=$PATH:/root/.nvm/versions/node/v24.x/bin pm2 startup systemd -u root --hp /root
pm2 save
```

---

## 9️⃣ 检查服务状态

```bash
pm2 ls
# 显示 yusic online
```

---

## 🔟 防火墙放行（默认 3000 端口）

```bash
ufw allow 3000
ufw reload
```

> 或服务器安全组需放行端口 3000

---


> 打开浏览器，F12 → Console，看到 `✅ WebSocket connected` 即成功。

---

## ✅ 更新部署（以后操作）

```bash
cd ~/Yusic-server
git pull
pnpm install
pnpm build
pm2 restart yusic
```

---

> 备注：
>
> * 可选：在 Express 上添加 `/test` 路由，直接访问 `http://VPS_IP:3000/test` 查看 WebSocket 日志。
> * 确保服务器端口防火墙和云平台安全组开放 3000 端口。
