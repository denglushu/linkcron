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
    mailApi: 'http://api.mmp.cc/api/mail',
    mailParams: {
      email: 'jusuvip@163.com',
      key: '408065802l',
      name: '网站监控系统',
      mail: 'dlushu@163.com',
      host: 'smtp.163.com',
      title: '网站状态监控报告'
    },
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
      // 使用HTML格式邮件确保换行可靠
      const mailHtml = `
        <html>
        <body>
          <h2>网站状态监控报告</h2>
          <p>生成时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p>
          <table border="1" cellpadding="5" cellspacing="0">
            <tr>
              <th>网站名称</th>
              <th>URL</th>
              <th>状态</th>
              <th>状态码</th>
              <th>响应时间</th>
              <th>详情</th>
            </tr>
            ${statusChecks.map(result => `
              <tr>
                <td>${result.name}</td>
                <td>${result.url}</td>
                <td>${result.ok ? '✅ 正常' : '❌ 异常'}</td>
                <td>${result.status}</td>
                <td>${result.responseTime}</td>
                <td>${result.statusText}</td>
              </tr>
            `).join('')}
          </table>
          <p>---<br/>本邮件由自动监控系统生成</p>
        </body>
        </html>
      `

      // 4. 发送HTML格式邮件
      const mailApiUrl = new URL(config.mailApi)
      Object.entries({
        ...config.mailParams,
        text: mailHtml,  // 使用HTML内容
        contentType: 'html'  // 明确指定HTML格式
      }).forEach(([key, value]) => {
        mailApiUrl.searchParams.append(key, value)
      })

      const mailResponse = await fetch(mailApiUrl.toString(), {
        headers: {
          'Accept': 'application/json'
        }
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