addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const secret = url.searchParams.get('secret') || ''

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>生成 TOTP - 2FA 动态密码</title>
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
      }
      #totp {
          font-size: 32px;
          font-weight: bold;
          color: #28a745;
          margin: 0 0 10px 0;
          padding: 15px;
          border: 1px dashed #28a745;
          border-radius: 8px;
          background-color: #e9f5e9;
          cursor: pointer;
          user-select: none; 
          transition: background-color 0.2s ease;
      }
      #totp:hover {
          background-color: #d4edda;
      }
      #timer {
          font-size: 16px;
          color: #5a6268;
          margin-bottom: 20px;
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
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
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
          <div id="totp" title="点击复制 TOTP">TOTP: ------</div>
          <div id="timer">有效时间: -- 秒</div>
      </div>
      <div id="url"><strong>分享链接:</strong> <span></span></div>
  </div>
  <div id="copyNotification" class="copy-notification">TOTP 已复制!</div>
  <script>
      let totpUpdateInterval;
      let timerUpdateInterval;
      async function generateTOTP(secret) {
          const epoch = Math.round(new Date().getTime() / 1000.0);
          const timeStep = 30;
          const counter = Math.floor(epoch / timeStep);
          const key = base32ToUint8Array(secret);
          if (!key || key.length === 0) {
              throw new Error("密钥无效或解码失败。");
          }
          const timeBuffer = new ArrayBuffer(8);
          const timeView = new DataView(timeBuffer);
          timeView.setUint32(4, counter, false);
          const cryptoKey = await window.crypto.subtle.importKey(
              'raw',
              key,
              { name: 'HMAC', hash: 'SHA-1' },
              false,
              ['sign']
          );
          const hmacResult = await window.crypto.subtle.sign('HMAC', cryptoKey, timeBuffer);
          const hmacArray = new Uint8Array(hmacResult);
          const offset = hmacArray[hmacArray.length - 1] & 0x0f;
          const binary =
              ((hmacArray[offset] & 0x7f) << 24) |
              ((hmacArray[offset + 1] & 0xff) << 16) |
              ((hmacArray[offset + 2] & 0xff) << 8) |
              (hmacArray[offset + 3] & 0xff);
          const otp = binary % Math.pow(10, 6);
          return otp.toString().padStart(6, '0');
      }
      function base32ToUint8Array(base32) {
          const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
          const paddingChar = '=';
          let b32 = base32.toUpperCase().replace(new RegExp('\\\\' + paddingChar + '+$'), '');
          if (b32.length === 0) return new Uint8Array(0);
          let bits = '';
          for (let i = 0; i < b32.length; i++) {
              const char = b32[i];
              const value = alphabet.indexOf(char);
              if (value === -1) {
                  console.error('无效的Base32字符:', char);
                  throw new Error('无效的Base32字符: ' + char);
              }
              bits += value.toString(2).padStart(5, '0');
          }
          const bytes = [];
          for (let i = 0; i + 8 <= bits.length; i += 8) {
              bytes.push(parseInt(bits.substring(i, i + 8), 2));
          }
          return new Uint8Array(bytes);
      }
      async function updateTOTPDisplay() {
          const secretInput = document.getElementById('secret');
          let rawSecret = secretInput.value;
          const totpElement = document.getElementById('totp');
          const urlElementSpan = document.querySelector('#url span');
          const validatedSecret = filterAndValidateSecret(rawSecret);
          if (!validatedSecret) {
              totpElement.innerText = 'TOTP: ------';
              document.getElementById('timer').innerText = '密钥无效';
              urlElementSpan.innerText = '请输入有效密钥以生成分享链接。';
              if (totpUpdateInterval) clearInterval(totpUpdateInterval);
              if (timerUpdateInterval) clearInterval(timerUpdateInterval);
              return;
          }
          if (rawSecret !== validatedSecret && secretInput.value === rawSecret) {
              secretInput.value = validatedSecret;
          }
          try {
              const token = await generateTOTP(validatedSecret);
              totpElement.innerText = 'TOTP: ' + token;
              urlElementSpan.innerText = window.location.origin + '/?secret=' + encodeURIComponent(validatedSecret);
          } catch (error) {
              console.error("生成TOTP时出错:", error);
              totpElement.innerText = 'TOTP: 错误';
              document.getElementById('timer').innerText = '生成错误';
              if (error.message.includes('无效的Base32字符')) {
                   alert("错误：密钥包含无效的Base32字符 “" + error.message.split(': ')[1] + "”。请检查您的密钥。");
              } else {
                   alert("生成TOTP时发生错误: " + error.message);
              }
              if (totpUpdateInterval) clearInterval(totpUpdateInterval);
              if (timerUpdateInterval) clearInterval(timerUpdateInterval);
          }
      }
      function updateTimer() {
          const timerElement = document.getElementById('timer');
          const epoch = Math.round(new Date().getTime() / 1000.0);
          const timeRemaining = 30 - (epoch % 30);
          timerElement.innerText = '有效时间: ' + timeRemaining + ' 秒';
          if (timeRemaining === 30 && document.getElementById('secret').value) {
              const validatedSecret = filterAndValidateSecret(document.getElementById('secret').value);
              if(validatedSecret) updateTOTPDisplay();
          }
      }
      function filterAndValidateSecret(rawSecret) {
          if (!rawSecret || typeof rawSecret !== 'string' || rawSecret.trim() === "") {
              return null;
          }
          let secret = rawSecret.replace(/\\s+/g, '').toUpperCase();
          let tempSecretForValidation = secret.replace(/=+$/, '');
          if (tempSecretForValidation.length === 0 && secret.includes('=')) {
              alert("密钥仅包含填充字符或清理后为空。请输入有效的Base32密钥。");
              return null;
          }
          if (tempSecretForValidation.length > 0 && !/^[A-Z2-7]+$/.test(tempSecretForValidation)) {
              alert("密钥中包含无效字符。Base32密钥应仅包含大写字母A-Z和数字2-7。");
              return null;
          }
          const minSecretLength = 8;
          if (tempSecretForValidation.length < minSecretLength) {
              alert("密钥太短。请确保输入有效的Base32密钥 (通常至少 " + minSecretLength + " 个字符，不包括填充符)。");
              return null;
          }
          if (tempSecretForValidation.length > 128) {
              alert("密钥过长。请检查您的密钥。");
              return null;
          }
          return secret;
      }
      function handleGenerateClick() {
          const secretInput = document.getElementById('secret');
          const rawSecret = secretInput.value;
          const validatedSecret = filterAndValidateSecret(rawSecret);
          if (validatedSecret == null) {
              if (totpUpdateInterval) clearInterval(totpUpdateInterval);
              if (timerUpdateInterval) clearInterval(timerUpdateInterval);
              document.getElementById('totp').innerText = 'TOTP: ------';
              document.getElementById('timer').innerText = '密钥无效';
              document.querySelector('#url span').innerText = '请输入有效密钥以生成分享链接。';
              return;
          }
          if (secretInput.value !== validatedSecret) {
               secretInput.value = validatedSecret;
          }
          if (totpUpdateInterval) clearInterval(totpUpdateInterval);
          if (timerUpdateInterval) clearInterval(timerUpdateInterval);
          updateTOTPDisplay();
          updateTimer();
          timerUpdateInterval = setInterval(updateTimer, 1000);
      }
      function showCopyNotification(message = "TOTP 已复制!") {
          const notification = document.getElementById('copyNotification');
          notification.innerText = message;
          notification.classList.add('show');
          setTimeout(() => {
              notification.classList.remove('show');
          }, 2000);
      }
      function copyToClipboard(text) {
          if (!text || text === '------' || text === '错误') {
              showCopyNotification("没有可复制的有效TOTP。");
              return;
          }
          navigator.clipboard.writeText(text).then(function() {
              showCopyNotification();
          }).catch(function(err) {
              console.error('复制文本失败: ', err);
              try {
                  var textarea = document.createElement("textarea");
                  textarea.value = text;
                  textarea.style.position = "fixed";
                  document.body.appendChild(textarea);
                  textarea.select();
                  document.execCommand("copy");
                  document.body.removeChild(textarea);
                  showCopyNotification();
              } catch (e) {
                  alert("复制失败。请手动复制。");
              }
          });
      }
      document.getElementById('generate').addEventListener('click', handleGenerateClick);
      document.getElementById('totp').addEventListener('click', function () {
          const totpText = this.innerText.split(': ')[1];
          copyToClipboard(totpText);
      });
      window.addEventListener('load', () => {
          const urlParams = new URLSearchParams(window.location.search);
          const secretFromUrl = urlParams.get('secret');
          const secretInput = document.getElementById('secret');
          const urlElementSpan = document.querySelector('#url span');
          if (secretFromUrl) {
              secretInput.value = secretFromUrl;
              handleGenerateClick();
          } else {
              urlElementSpan.innerText = '输入密钥后，此处会显示分享链接。';
              document.getElementById('totp').innerText = 'TOTP: ------';
              document.getElementById('timer').innerText = '请输入密钥并点击生成。';
          }
      });
  </script>
</body>
</html>`

  return new Response(html, {
    headers: { 'content-type': 'text/html;charset=UTF-8' },
  })
}