addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // 配置信息
  const config = {
    targetUrls: [
      { name: '短视频API', url: 'https://xzdx.top/api/duan/' },
      { name: '长转短API', url: 'https://www.ffapi.cn/int/v1/longdwz' },
      { name: 'IP查询API', url: 'https://api.janelink.cn/api/ip.php' }
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

    // 3. 仅当有异常时才发送邮件
    if (hasError) {
      // 使用环境变量获取邮件配置
      const mailConfig = {
        api: MAIL_API_URL,               // Cloudflare Workers 环境变量
        params: {
          email: MAIL_FROM_EMAIL,        // 发信邮箱
          key: MAIL_API_KEY,             // 邮箱授权码
          name: MAIL_FROM_NAME,         // 发信昵称
          mail: MAIL_TO_EMAIL,          // 收件邮箱
          host: MAIL_SMTP_HOST,         // SMTP服务器
          title: MAIL_TITLE     // 邮件标题
        }
      }

      // 美化后的HTML邮件模板
      const mailHtml = generateEmailHtml(statusChecks)

      // 4. 发送HTML格式邮件
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
      padding: 20px;
      border-radius: 5px 5px 0 0;
    }
    h1 {
      margin: 0;
      font-size: 24px;
    }
    .report-time {
      color: #ecf0f1;
      font-size: 14px;
      margin-top: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    th {
      background-color: #3498db;
      color: white;
      text-align: left;
      padding: 12px;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #ddd;
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
    .summary {
      background-color: #eaf2f8;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .badge {
      display: inline-block;
      padding: 3px 7px;
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
    
    <div class="summary">
      <h3>监控概览</h3>
      <p>总检查网站: ${statusChecks.length} 个</p>
      <p>正常网站: <span class="badge badge-ok">${statusChecks.filter(s => s.ok).length}</span></p>
      <p>异常网站: <span class="badge badge-error">${statusChecks.filter(s => !s.ok).length}</span></p>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>网站名称</th>
          <th>URL</th>
          <th>状态</th>
          <th>状态码</th>
          <th>响应时间</th>
          <th>详情</th>
        </tr>
      </thead>
      <tbody>
        ${statusChecks.map(result => `
          <tr>
            <td>${result.name}</td>
            <td><a href="${result.url}">${result.url}</a></td>
            <td class="${result.ok ? 'status-ok' : 'status-error'}">
              ${result.ok ? '✅ 正常' : '❌ 异常'}
            </td>
            <td>${result.status}</td>
            <td>${result.responseTime}</td>
            <td>${result.statusText}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="footer">
      <p>---</p>
      <p>本邮件由自动监控系统生成，请勿直接回复</p>
      <p>© ${new Date().getFullYear()} 网站监控系统</p>
    </div>
  </div>
</body>
</html>
  `
}