// 同时监听 fetch 和 scheduled 事件
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

addEventListener('scheduled', event => {
  event.waitUntil(handleScheduled())
})

// 处理 HTTP 请求
async function handleRequest(request) {
  // 标记为HTTP请求来源（非定时任务）
  return await runMonitoringTask(false)
}

// 处理定时任务
async function handleScheduled() {
  console.log('Cron job triggered at:', new Date().toISOString())
  // 标记为定时任务来源
  return await runMonitoringTask(true)
}

// 主监控任务，添加isScheduled参数区分来源
async function runMonitoringTask(isScheduled) {
  // 配置信息
  const config = {
    targetUrls: [
      { name: '短视频API', url: 'https://xzdx.top/api/duan/' },
      { name: '泄露查询API', url: 'https://api.janelink.cn/api/privacy.php?value=1' },
      { name: 'IP查询API', url: 'https://api.janelink.cn/api/ip.php' },
      { name: '照妖镜', url: 'https://zyj.22web.org' },
      { name: '彩虹搭建', url: 'https://dh.janelink.cn' }
    ],
    timeout: 8000
  }

  try {
    // 1. 检查所有目标网站状态
    const statusChecks = await Promise.all(config.targetUrls.map(async (site) => {
      const startTime = Date.now()
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), config.timeout)
        
        const response = await fetch(site.url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })
        
        clearTimeout(timeout)
        const responseTime = Date.now() - startTime
        
        return {
          name: site.name,
          url: site.url,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          responseTime: responseTime + 'ms'
        }
      } catch (error) {
        return {
          name: site.name,
          url: site.url,
          status: 'ERROR',
          statusText: error.message,
          ok: false,
          responseTime: 'timeout'
        }
      }
    }))

    // 2. 检查是否有异常网站
    const hasError = statusChecks.some(result => !result.ok)

    // 3. 根据来源处理不同响应
    if (isScheduled) {
      // 定时任务：有异常才发送邮件，始终返回JSON
      if (hasError) {
        // 使用环境变量获取邮件配置
        const mailConfig = {
          api: MAIL_API_URL,               // Cloudflare Workers 环境变量
          params: {
            email: MAIL_FROM_EMAIL,        // 发信邮箱
            key: MAIL_API_KEY,             // 邮箱授权码
            name: MAIL_FROM_NAME,          // 发信昵称
            mail: MAIL_TO_EMAIL,           // 收件邮箱
            host: MAIL_SMTP_HOST,          // SMTP服务器
            title: MAIL_TITLE              // 邮件标题
          }
        }

        // 生成HTML邮件内容
        const mailHtml = generateEmailHtml(statusChecks)

        // 发送HTML格式邮件
        const mailApiUrl = new URL(mailConfig.api)
        Object.entries({
          ...mailConfig.params,
          text: mailHtml,
          contentType: 'html'
        }).forEach(([key, value]) => {
          mailApiUrl.searchParams.append(key, value)
        })

        const mailResponse = await fetch(mailApiUrl.toString(), {
          headers: { 'Accept': 'application/json' }
        })

        const mailResult = await mailResponse.json()

        return new Response(JSON.stringify({
          success: true,
          statusChecks: statusChecks,
          mailSent: true,
          mailResponse: mailResult,
          timestamp: new Date().toISOString()
        }, null, 2), {
          headers: { 
            'Content-Type': 'application/json; charset=utf-8',
            'X-Monitor-Version': '3.0'
          }
        })
      } else {
        return new Response(JSON.stringify({
          success: true,
          statusChecks: statusChecks,
          mailSent: false,
          message: "所有网站正常，未发送邮件",
          timestamp: new Date().toISOString()
        }, null, 2), {
          headers: { 
            'Content-Type': 'application/json; charset=utf-8',
            'X-Monitor-Version': '3.0'
          }
        })
      }
    } else {
      // HTTP请求：不发送邮件，返回HTML报告
      const htmlContent = generateEmailHtml(statusChecks)
      return new Response(htmlContent, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Monitor-Version': '3.0'
        }
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    })
  }
}

// 生成美观的HTML邮件内容
function generateEmailHtml(statusChecks) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>网站监控报告</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9f9f9;
    }
    .header {
      background-color: #2c3e50;
      color: white;
      padding: 15px 20px;
      border-radius: 5px 5px 0 0;
      margin-bottom: 15px;
    }
    h1 {
      margin: 0;
      font-size: 22px;
    }
    .report-time {
      color: #ecf0f1;
      font-size: 13px;
      margin-top: 5px;
    }
    .content-wrapper {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .summary {
      background-color: #eaf2f8;
      padding: 12px 15px;
      border-radius: 5px;
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
    }
    .summary-item {
      min-width: 120px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    th {
      background-color: #3498db;
      color: white;
      text-align: left;
      padding: 10px 12px;
      font-size: 14px;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #ddd;
      font-size: 14px;
      word-break: break-all;
    }
    tr:nth-child(even) {
      background-color: #f2f2f2;
    }
    tr:hover {
      background-color: #e8f4fc;
    }
    .status-ok {
      color: #27ae60;
      font-weight: bold;
    }
    .status-error {
      color: #e74c3c;
      font-weight: bold;
    }
    .footer {
      margin-top: 20px;
      font-size: 12px;
      color: #95a5a6;
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: bold;
    }
    .badge-ok {
      background-color: #d5f5e3;
      color: #27ae60;
    }
    .badge-error {
      background-color: #fadbd8;
      color: #e74c3c;
    }
    a {
      color: #2980b9;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>网站状态监控报告</h1>
      <div class="report-time">
        报告生成时间: ${new Date().toLocaleString('zh-CN', { 
          timeZone: 'Asia/Shanghai',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })}
      </div>
    </div>
    
    <div class="content-wrapper">
      <div class="summary">
        <div class="summary-item">
          <strong>总检查网站:</strong> ${statusChecks.length} 个
        </div>
        <div class="summary-item">
          <strong>正常网站:</strong> <span class="badge badge-ok">${statusChecks.filter(s => s.ok).length}</span>
        </div>
        <div class="summary-item">
          <strong>异常网站:</strong> <span class="badge badge-error">${statusChecks.filter(s => !s.ok).length}</span>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <<th>网站名称</</th>
            <<th>URL</</th>
            <<th>状态</</th>
            <<th>状态码</</th>
            <<th>响应时间</</th>
            <<th>详情</</th>
          </tr>
        </thead>
        <tbody>
          ${statusChecks.map(result => `
            <tr>
              <td>${result.name}</td>
              <td><a href="${result.url.replace(/\s+/g, '')}">${result.url.replace(/\s+/g, '')}</a></td>
              <td class="${result.ok ? 'status-ok' : 'status-error'}">
                ${result.ok ? '✔ 正常' : '✖ 异常'}
              </td>
              <td>${result.status}</td>
              <td>${result.responseTime}</td>
              <td>${result.statusText}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="footer">
      <p>---</p>
      <p>本报告由自动监控系统生成</p>
      <p>© ${new Date().getFullYear()} 网站监控系统</p>
    </div>
  </div>
</body>
</html>`
}