# 部署指南

## 1. 环境准备
确保服务器已安装 Node.js (推荐 v18+)。

## 2. 解决 "pnpm: command not found"
如果不强制使用 pnpm，可以直接用 `npm`。如果想用 `pnpm`，需全局安装：
```bash
npm install -g pnpm
```

## 3. 部署步骤
1.  **上传文件**：确保将 `package.json`, `pnpm-lock.yaml`, `.env` 和 `dist/` 目录上传到服务器同一文件夹。
2.  **安装依赖**：
    ```bash
    # 使用 pnpm
    pnpm install --prod
    
    # 或使用 npm
    npm install --production
    ```
3.  **启动服务**：
    ```bash
    node dist/index.js
    ```

## 4. 防火墙设置 (开放 3000 端口)
如果你无法访问，可能是防火墙拦截了端口。

### Ubuntu/Debian (`ufw`)
```bash
ufw allow 3000
ufw reload
```

### CentOS/RedHat (`firewalld`)
如果提示 `ufw: command not found`，请尝试：
```bash
firewall-cmd --zone=public --add-port=3000/tcp --permanent
firewall-cmd --reload
```

### 云服务器 (阿里云/腾讯云/AWS)
**重要**：如果不生效，请检查云控制台的 **安全组 (Security Group)** 设置，在入站规则中放行 TCP:3000 端口。

## 5. 后台运行 (推荐 PM2)
```bash
npm install -g pm2
pm2 start dist/index.js --name yusic-server
pm2 save
```
