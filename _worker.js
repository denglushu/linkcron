addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // 配置信息
  const config = {
    targetUrls: [
      { name: '短链接API', url: 'https://xzdx.top/api/duan/' },
      { name: '长转短API', url: 'https://www.ffapi.cn/int/v1/longdwz' },
      { name: 'IP查询API', url: 'https://api.janelink.cn/api/ip.php' }
    ],
    mailApi: 'https://zyj.22web.org/mail.php',
    mailParams: {
      to: 'jusuvip@163.com',
      title: '网站状态报告',
      user: 'jusuvip@163.com',
      pass: '408065802l',
      smtp: '163'
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

    // 2. 生成邮件内容（GB2312编码）
    const mailContent = `网站状态监测报告\n检测时间：${new Date().toLocaleString('zh-CN')}\n\n` +
      statusChecks.map(result => 
        `【${result.name}】\nURL: ${result.url}\n状态: ${result.ok ? '正常' : '异常'}\n` +
        `状态码: ${result.status}\n响应时间: ${result.responseTime}\n详情: ${result.statusText}\n`
      ).join('\n')

    // 3. 构造表单数据（使用URLSearchParams自动编码）
    const formData = new URLSearchParams()
    formData.append('to', config.mailParams.to)
    formData.append('title', config.mailParams.title)
    formData.append('user', config.mailParams.user)
    formData.append('pass', config.mailParams.pass)
    formData.append('smtp', config.mailParams.smtp)
    formData.append('content', mailContent)

    // 4. 发送邮件请求（模拟浏览器行为）
    const mailResponse = await fetch(config.mailApi, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=GB2312',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://zyj.22web.org/',
        'Origin': 'https://zyj.22web.org'
      },
      body: formData.toString()
    })

    // 5. 处理可能的重定向
    let finalResponse
    if (mailResponse.redirected) {
      finalResponse = await fetch(mailResponse.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': config.mailApi
        }
      })
    } else {
      finalResponse = mailResponse
    }

    // 6. 返回监控结果
    return new Response(JSON.stringify({
      success: true,
      statusChecks: statusChecks,
      mailStatus: finalResponse.status,
      timestamp: new Date().toISOString(),
      mailResponse: await finalResponse.text()
    }, null, 2), {
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
        'X-Monitor-Version': '22web-1.0'
      }
    })

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