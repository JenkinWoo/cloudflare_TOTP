# Serverless TOTP - 纯客户端动态密码生成器

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Deploy with Wrangler](https://img.shields.io/badge/Deploy_with-Wrangler-f38020?style=flat-square&logo=cloudflare)](https://developers.cloudflare.com/workers/wrangler/)

一个部署在 Cloudflare Workers 上的纯客户端 TOTP (基于时间的一次性密码) 动态密码生成器。**你的密钥永远不会被发送到服务器**，所有计算均在你的浏览器中安全完成。

**[➡️ 点击此处查看在线演示 (Live Demo)](https://2fa.frp.gs)**

---

## 📖 项目简介 (Introduction)

本项目是一个简单而强大的两步验证 (2FA) 动态密码查看工具。与需要后端的传统 TOTP 服务不同，它利用 Cloudflare Workers 的边缘网络来极速分发一个独立的 HTML 文件。该文件内嵌了所有必需的 JavaScript 和 CSS。

一旦页面加载完毕，所有的 TOTP 计算都将使用浏览器内置的 [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) 在本地执行。这意味着你的 Base32 密钥是完全私密的，不会在计算过程中传输到任何服务器，为你提供了极高的安全性。

## ✨ 核心特性 (Core Features)

* **🔐 隐私优先**: 所有加密操作均在客户端完成，密钥永远不会离开你的浏览器。
* **⚡️ 极速访问**: 部署在 Cloudflare 的全球边缘网络，无论你身在何处都能秒级访问。
* **🚫 零后端依赖**: 无需数据库，无需复杂的服务器配置，整个应用就是一个 `worker.js` 文件。
* **🔗 链接分享**: 可以生成包含密钥的分享链接，方便你在不同设备间快速同步。 (注意：请仅在受信任的环境中分享此链接)。
* **⏱️ 实时更新**: 动态密码每30秒自动刷新，并提供一个清晰的倒计时器。
* **📋 一键复制**: 只需点击密码，即可轻松复制到剪贴板。
* **🛡️ 健壮的验证**: 自动过滤并验证输入的密钥格式，防止无效输入。
* **📱 响应式设计**: 在桌面和移动设备上都有良好的显示效果。

## 🤔 工作原理 (How It Works)

整个流程非常简单：

1. 用户通过浏览器访问你部署的 Cloudflare Worker URL。
2. Cloudflare Worker 立即返回一个完整的 HTML 响应，其中包含了所有的界面、样式和计算逻辑。
3. 用户的浏览器加载并执行页面内的 JavaScript 代码。
4. 当你输入密钥并点击生成时，JavaScript 会调用浏览器自身的 Web Crypto API 进行 HMAC-SHA1 计算。
5. 计算出的 TOTP 结果直接显示在页面上。

在这个过程中，Cloudflare Worker 仅扮演了一个静态文件服务器的角色，不参与任何计算或数据处理。

## 🚀 部署指南 (Deployment Guide)

你可以非常轻松地将此项目部署到你自己的 Cloudflare 账户。

### 准备工作

1. 拥有一个 [Cloudflare 账户](https://dash.cloudflare.com/sign-up)。
2. 安装 [Node.js](https://nodejs.org/) 和 `npm`。
3. 通过 `npm` 安装 Cloudflare 的命令行工具 `wrangler`：

    ```bash
    npm install -g wrangler
    ```

---

### 部署方式一：使用 Wrangler CLI (适合开发者)

1. **克隆或下载项目**
    将本项目的 `worker.js` 文件下载到你的电脑上，并进入该目录。

2. **登录 Wrangler**
    执行以下命令，它会打开浏览器让你登录并授权 Wrangler。

    ```bash
    wrangler login
    ```

3. **创建 `wrangler.toml` 配置文件**
    在 `worker.js` 所在的目录中，创建一个名为 `wrangler.toml` 的文件，并填入以下内容：

    ```toml
    # wrangler.toml
    name = "my-totp-generator"  # 你可以自定义Worker的名称
    main = "worker.js"          # 指定入口文件
    compatibility_date = "2025-06-27" # 使用当前日期即可

    # ！！！请务必填入你自己的 Account ID
    # 如何找到？登录Cloudflare -> 右侧边栏 -> 概述 -> 账户ID
    account_id = "YOUR_CLOUDFLARE_ACCOUNT_ID"
    ```

    **注意:** 请将 `name` 和 `account_id` 替换为你自己的信息。

4. **一键部署**
    运行以下命令进行部署：

    ```bash
    wrangler deploy
    ```

    部署成功后，Wrangler 会在终端显示你的 Worker 的公开 URL。恭喜你，部署完成了！

---

### 部署方式二：通过 Cloudflare 网页后台 (无需命令行)

这种方法不需要在你的电脑上安装任何软件，全程在浏览器中操作即可。

1. **复制 Worker 代码**
    * 打开本项目的核心代码文件：[`worker.js`](./worker.js)
    * 点击右上角的 "Raw" 按钮，进入原始代码视图。
    * 全选 (Ctrl+A 或 Cmd+A) 并复制 (Ctrl+C 或 Cmd+C) 所有的代码。

2. **登录 Cloudflare 后台**
    * 前往 [Cloudflare 仪表板](https://dash.cloudflare.com/) 并登录。
    * 在左侧菜单中，选择 **Workers & Pages**。

3. **创建新的 Worker**
    * 点击 **创建应用程序 (Create Application)**，然后选择 **创建 Worker (Create Worker)**。
    * 为你的 Worker 设置一个**唯一的名称** (例如 `my-secret-totp-viewer`)，这将成为它 URL 的一部分。
    * 点击 **部署 (Deploy)**。

4. **粘贴并部署代码**
    * 创建成功后，点击 **编辑代码 (Edit code)**。
    * 删除编辑器中默认的 "Hello World" 代码。
    * 将步骤 1 中复制的**全部代码**粘贴到编辑器中。
    * 点击右上角的 **保存并部署 (Save and deploy)** 按钮。

现在，你的 TOTP 生成器已经部署成功了！你可以直接访问它的 `workers.dev` 地址来使用。

## 🛠️ 使用方法 (How to Use)

1. 打开你部署后的 Worker URL。
2. 在输入框中，粘贴你的 Base32 格式的密钥（例如从 Google Authenticator 或其他服务导出的密钥）。
3. 点击 "生成 TOTP" 按钮。
4. 页面会立即显示当前的6位动态密码和有效期倒计时。
5. 若要与你的其他设备分享，可以复制 "分享链接" 中的 URL。

## 🤝 如何贡献 (Contributing)

我们欢迎任何形式的贡献！如果你有任何改进建议或发现了 Bug，请随时提交 Issue 或 Pull Request。

1. Fork 本仓库
2. 创建你的功能分支 (`git checkout -b feature/NewFeature`)
3. 提交你的更改 (`git commit -m 'Add some NewFeature'`)
4. 推送到分支 (`git push origin feature/NewFeature`)
5. 创建一个拉取请求 (Pull Request)

## 📄 许可证 (License)

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)
