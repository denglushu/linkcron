addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // 配置信息（UTF-8编码）
  const config = {
    targetUrls: [
      { name: '短链接API', url: 'https://xzdx.top/api/duan/' },
      { name: '长转短API', url: 'https://www.ffapi.cn/int/v1/longdwz' },
      { name: 'IP查询API', url: 'https://api.janelink.cn/api/ip.php' }
    ],
    // 使用更可靠的邮件服务（推荐替换为你的实际邮件API）
    mailApi: 'https://api.mailservice.com/send', // 替换为你的邮件API
    mailParams: {
      to: 'jusuvip@163.com',
      subject: '多网站状态报告',
      from: 'monitor@yourservice.com'
    },
    // 超时设置（毫秒）
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

    // 2. 生成邮件内容
    const mailContent = `网站状态监测报告\n检测时间：${new Date().toLocaleString('zh-CN')}\n\n` +
      statusChecks.map(result => 
        `【${result.name}】\nURL: ${result.url}\n状态: ${result.ok ? '✅ 正常' : '❌ 异常'}\n` +
        `状态码: ${result.status}\n响应时间: ${result.responseTime}\n详情: ${result.statusText}\n`
      ).join('\n') +
      `\n---\n监控系统自动发送，请勿直接回复`

    // 3. 发送邮件（使用POST方式避免编码问题）
    const mailResponse = await fetch(config.mailApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer your_mail_api_key' // 替换为你的API密钥
      },
      body: JSON.stringify({
        ...config.mailParams,
        text: mailContent,
        html: `<pre>${mailContent.replace(/\n/g, '<br>')}</pre>`
      })
    })

    // 4. 处理响应
    let mailResult
    try {
      mailResult = await mailResponse.json()
    } catch {
      mailResult = await mailResponse.text()
    }

    // 5. 返回监控结果
    return new Response(JSON.stringify({
      success: true,
      statusChecks: statusChecks,
      mailStatus: mailResponse.status,
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
        'X-Monitor-Version': '2.0'
      }
    })

  } catch (error) {
    // 错误处理
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