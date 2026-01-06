export default {
    async fetch(request) {
      const serverTime = Date.now();
      return new Response(htmlTemplate(serverTime), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
  };
  
  function htmlTemplate(serverTime) {
    return `
  <!DOCTYPE html>
  <html lang="zh-CN">
  
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TOTP 动态密码</title>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f4f7f6;
        color: #333;
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
      }
  
      .container {
        background-color: #ffffff;
        padding: 30px 40px;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        max-width: 500px;
        width: 90%;
        margin: 20px;
        text-align: center;
      }
  
      h1 {
        color: #2c3e50;
        margin-bottom: 25px;
        font-size: 28px;
      }
  
      input[type="text"]#secret {
        padding: 12px 15px;
        margin: 10px 0 20px 0;
        width: calc(100% - 32px);
        border: 1px solid #ddd;
        border-radius: 5px;
        font-size: 16px;
        box-sizing: border-box;
      }
  
      input[type="text"]#secret:focus {
        border-color: #007bff;
        outline: none;
        box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
      }
  
      button#generate {
        background-color: #007bff;
        color: white;
        padding: 12px 20px;
        border: none;
        border-radius: 5px;
        font-size: 16px;
        cursor: pointer;
        transition: background-color 0.3s ease, transform 0.1s ease;
        width: 100%;
        margin-bottom: 25px;
        box-sizing: border-box;
      }
  
      button#generate:hover {
        background-color: #0056b3;
      }
  
      button#generate:active {
        transform: scale(0.98);
      }
  
      #totp-display-area {
        margin: 20px 0;
        min-height: 100px; 
      }
  
      #totp {
        font-size: 42px;
        font-weight: bold;
        color: #333;
        margin: 0 0 15px 0;
        padding: 10px;
        cursor: pointer;
        user-select: none;
        letter-spacing: 4px;
        font-family: Consolas, Monaco, 'Courier New', monospace;
      }
  
      #totp:hover {
        color: #007bff;
      }
  
      /* 进度条轨道 */
      .progress-track {
        width: 100%;
        height: 6px;
        background-color: #e9ecef;
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 5px;
      }
  
      /* 进度条填充 */
      .progress-fill {
        height: 100%;
        width: 0%; /* 初始宽度 */
        background-color: #28a745;
        border-radius: 3px;
        /* 关键修改：移除 transition 默认属性，完全由 JS 控制，防止唤醒时“滑过去” */
        /* transition: width 1s linear;  <-- 删除这行，由JS动态添加 */
      }
  
      #timer-text {
        font-size: 12px;
        color: #999;
        margin-bottom: 15px;
      }
  
      #sync-status {
        font-size: 12px;
        color: #bbb;
        margin-top: 5px;
        font-style: italic;
      }
  
      #url {
        font-size: 13px;
        color: #6c757d;
        word-break: break-all;
        margin-top: 20px;
        background-color: #f8f9fa;
        padding: 10px 12px;
        border-radius: 5px;
        border: 1px solid #e9ecef;
        text-align: left;
      }
  
      #url strong {
        color: #495057;
      }
  
      .copy-notification {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #28a745;
        color: white;
        padding: 12px 25px;
        border-radius: 25px;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
        font-size: 14px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
      }
  
      .copy-notification.show {
        opacity: 1;
        transform: translateX(-50%) translateY(-10px);
      }
    </style>
  </head>
  
  <body>
    <div class="container">
      <h1>生成 TOTP 动态密码</h1>
      <input type="text" id="secret" placeholder="在此输入您的密钥" value="">
      <button id="generate">生成 TOTP</button>
      
      <div id="totp-display-area">
        <div id="totp" title="点击复制 TOTP">------</div>
        <div class="progress-track">
          <div class="progress-fill" id="progress-bar"></div>
        </div>
        <div id="timer-text">等待生成...</div>
        <div id="sync-status"></div>
      </div>
      
      <div id="url"><strong>分享链接:</strong> <span></span></div>
    </div>
    
    <div id="copyNotification" class="copy-notification">TOTP 已复制!</div>
  
    <script>
      // --- 1. 时间同步初始化 ---
      const serverTimeAtLoad = ${serverTime}; 
      const clientTimeAtLoad = Date.now();
      const timeOffset = serverTimeAtLoad - clientTimeAtLoad;
      
      function getCorrectedTime() {
          return Date.now() + timeOffset;
      }
      
      const offsetSec = (timeOffset / 1000).toFixed(1);
      const statusMsg = Math.abs(offsetSec) < 1 
          ? "服务器时间同步完成" 
          : "已修正本地时间偏差 " + (offsetSec > 0 ? "+" : "") + offsetSec + "秒";
      document.getElementById('sync-status').innerText = statusMsg;
  
      // --- 变量定义 ---
      let loopId = null; 
      let lastCounter = -1;
      let isRunning = false;
  
      // --- 2. TOTP 算法 ---
      async function generateTOTP(secret) {
        const epoch = Math.floor(getCorrectedTime() / 1000.0)
        const counter = Math.floor(epoch / 30)
        const key = base32ToUint8Array(secret)
        const timeBuffer = new ArrayBuffer(8)
        const timeView = new DataView(timeBuffer)
        timeView.setUint32(4, counter, false)
        
        const cryptoKey = await window.crypto.subtle.importKey(
          'raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
        )
        const hmacResult = await window.crypto.subtle.sign('HMAC', cryptoKey, timeBuffer)
        const hmacArray = new Uint8Array(hmacResult)
        const offset = hmacArray[hmacArray.length - 1] & 0x0f
        const binary =
          ((hmacArray[offset] & 0x7f) << 24) |
          ((hmacArray[offset + 1] & 0xff) << 16) |
          ((hmacArray[offset + 2] & 0xff) << 8) |
          (hmacArray[offset + 3] & 0xff)
        const otp = binary % Math.pow(10, 6)
        return otp.toString().padStart(6, '0')
      }
  
      function base32ToUint8Array(base32) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
        const paddingChar = '='
        let b32 = base32.toUpperCase().replace(new RegExp('\\\\' + paddingChar + '+$'), '')
        if (b32.length === 0) return new Uint8Array(0)
        let bits = ''
        for (let i = 0; i < b32.length; i++) {
          const char = b32[i]
          const value = alphabet.indexOf(char)
          if (value === -1) throw new Error('无效的Base32字符: ' + char)
          bits += value.toString(2).padStart(5, '0')
        }
        const bytes = []
        for (let i = 0; i + 8 <= bits.length; i += 8) {
          bytes.push(parseInt(bits.substring(i, i + 8), 2))
        }
        return new Uint8Array(bytes)
      }
  
      // --- 3. 核心逻辑：渲染帧 ---
      // 将“计算并显示”提取为一个独立的同步函数
      function renderFrame(forceUpdate = false) {
        const secretInput = document.getElementById('secret')
        // 如果没有正在运行，或者密钥不合法，直接退出
        if (!isRunning && !forceUpdate) return;
        
        const rawSecret = secretInput.value;
        if (!rawSecret) return;
  
        const epoch = Math.floor(getCorrectedTime() / 1000.0)
        const timeStep = 30
        
        // 1. 更新进度条 (UI)
        const timeRemaining = timeStep - (epoch % timeStep)
        const percentage = (timeRemaining / timeStep) * 100
        
        const progressBar = document.getElementById('progress-bar')
        const timerText = document.getElementById('timer-text')
        const totpEl = document.getElementById('totp')
  
        // 设置进度条样式 (这里每次都设置，确保唤醒时瞬间生效)
        progressBar.style.width = percentage + '%'
        timerText.innerText = timeRemaining + '秒后刷新'
  
        // 颜色逻辑
        if (timeRemaining <= 5) {
          progressBar.style.backgroundColor = '#dc3545' 
          totpEl.style.color = '#dc3545'
        } else {
          progressBar.style.backgroundColor = '#28a745' 
          totpEl.style.color = '#333'
        }
  
        // 2. 更新 Code (逻辑)
        const currentCounter = Math.floor(epoch / timeStep)
        
        // 如果 Counter 变了，或者强制更新 (例如唤醒时)
        if (currentCounter !== lastCounter || forceUpdate) {
           // 进行简单的格式校验
           const validatedSecret = filterAndValidateSecret(rawSecret);
           if (validatedSecret) {
               generateTOTP(validatedSecret).then(token => {
                  const formattedToken = token.slice(0, 3) + ' ' + token.slice(3);
                  totpEl.innerText = formattedToken
                  document.querySelector('#url span').innerText = 
                     window.location.origin + '/?secret=' + encodeURIComponent(validatedSecret)
                  
                  lastCounter = currentCounter // 更新记录
               }).catch(console.error)
           }
        }
      }
  
      // --- 4. 循环控制 ---
      function startLoop() {
        if (loopId) cancelAnimationFrame(loopId);
        isRunning = true;
        
        function step() {
          renderFrame(false); // 正常帧更新
          loopId = requestAnimationFrame(step);
        }
        loopId = requestAnimationFrame(step);
      }
  
      function stopLoop() {
        if (loopId) cancelAnimationFrame(loopId);
        loopId = null;
        isRunning = false;
      }
  
      // --- 5. 关键修复：页面可见性处理 ---
      function handleVisibilityChange() {
         if (document.hidden) {
             // 页面隐藏时，可以暂停循环以节省资源 (浏览器本身也会暂停 RAF)
             // 我们这里什么都不做，依赖浏览器的自动暂停
         } else {
             // 页面重新可见！
             // 1. 立即强制渲染一次，不要等待 RAF 的回调
             //    将 lastCounter 重置，强迫 generateTOTP 重新运行，防止 Code 没变但 UI 卡住
             lastCounter = -1; 
             
             // 2. 移除进度条的 transition (如果有)，防止用户看到“进度条瞬间跳跃”的动画
             const bar = document.getElementById('progress-bar');
             bar.style.transition = 'none';
             
             // 3. 执行强制渲染
             renderFrame(true);
             
             // 4. 稍微延迟一点点恢复动画效果 (可选，为了平滑)
             setTimeout(() => {
                 bar.style.transition = 'width 1s linear';
             }, 100);
  
             // 5. 确保循环还在跑
             if (isRunning && !loopId) {
                 startLoop();
             }
         }
      }
  
      // 绑定可见性事件 (既监听 visibilitychange 也监听 focus，双重保险)
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("focus", handleVisibilityChange);
  
  
      // --- 6. 辅助函数 ---
      function filterAndValidateSecret(rawSecret) {
        if (!rawSecret || typeof rawSecret !== 'string' || rawSecret.trim() === "") return null
        let secret = rawSecret.replace(/\\s+/g, '').toUpperCase().replace(/=+$/, '')
        if (secret.length < 8) return null
        if (!/^[A-Z2-7]+$/.test(secret)) return null
        return secret
      }
  
      function handleGenerateClick() {
        const secretInput = document.getElementById('secret')
        const validatedSecret = filterAndValidateSecret(secretInput.value)
        
        if (!validatedSecret) {
          stopLoop()
          document.getElementById('totp').innerText = '------'
          document.getElementById('timer-text').innerText = '密钥无效'
          document.getElementById('progress-bar').style.width = '0%'
          alert("密钥无效，请检查格式。")
          return
        }
        
        secretInput.value = validatedSecret
        startLoop();
        // 点击瞬间立即渲染一次
        renderFrame(true); 
      }
  
      function copyToClipboard(text) {
        if (!text || text.includes('-')) return;
        const cleanText = text.replace(/ /g, '');
        navigator.clipboard.writeText(cleanText).then(() => {
          const notif = document.getElementById('copyNotification');
          notif.classList.add('show');
          setTimeout(() => notif.classList.remove('show'), 2000);
        });
      }
  
      // --- 7. 事件绑定 ---
      document.getElementById('generate').addEventListener('click', handleGenerateClick)
      document.getElementById('totp').addEventListener('click', function () {
        copyToClipboard(this.innerText)
      })
  
      window.addEventListener('load', () => {
        const urlParams = new URLSearchParams(window.location.search)
        const secretFromUrl = urlParams.get('secret')
        if (secretFromUrl) {
          document.getElementById('secret').value = secretFromUrl
          handleGenerateClick()
        } else {
          document.querySelector('#url span').innerText = '输入密钥后，此处会显示分享链接。'
        }
      });
  
    </script>
  </body>
  </html>
    `;
  }
