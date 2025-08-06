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
    // 新的邮件API配置
    mailApi: 'http://api.mmp.cc/api/mail',
    mailParams: {
      email: 'jusuvip@163.com',    // 发信邮箱
      key: '408065802l',                // 邮箱授权码
      name: '网站监控系统',                 // 发信昵称
      mail: 'dlushu@163.com',             // 收件邮箱                // 发信昵称
      host: 'stmp.163.com',                // 发信昵称
      title: '网站状态监控报告'             // 邮件标题
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

    // 2. 生成邮件正文内容
    const mailText = `网站状态监控报告\n生成时间：${new Date().toLocaleString('zh-CN')}\n\n` +
      statusChecks.map(result => 
        `【${result.name}】\nURL: ${result.url}\n状态: ${result.ok ? '✅ 正常' : '❌ 异常'}\n` +
        `状态码: ${result.status}\n响应时间: ${result.responseTime}\n详情: ${result.statusText}\n`
      ).join('\n') +
      `\n---\n本邮件由自动监控系统生成`

    // 3. 发送邮件请求
    const mailApiUrl = new URL(config.mailApi)
    Object.entries({
      ...config.mailParams,
      text: mailText  // 邮件内容参数
    }).forEach(([key, value]) => {
      mailApiUrl.searchParams.append(key, value)
    })

    const mailResponse = await fetch(mailApiUrl.toString(), {
      headers: {
        'Accept': 'application/json'
      }
    })

    // 4. 处理邮件API响应
    const mailResult = await mailResponse.json()

    // 5. 返回监控结果
    return new Response(JSON.stringify({
      success: true,
      statusChecks: statusChecks,
      mailResponse: mailResult,
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
        'X-Monitor-Version': '3.0'
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