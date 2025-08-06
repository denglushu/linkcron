addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // 配置信息（建议使用环境变量）
  const config = {
    sitesToCheck: [
      { name: "短网址API", url: "https://xzdx.top/api/duan/" },
      { name: "FFAPI长转短", url: "https://www.ffapi.cn/int/v1/longdwz" },
      { name: "Janelink IP查询", url: "https://api.janelink.cn/api/ip.php" }
    ],
    mailApi: 'https://zyj.22web.org/mail.php',
    mailParams: {
      to: 'jusuvip@163.com',
      title: '多站点状态报告',
      user: 'jusuvip@163.com',
      pass: '408065802l',
      smtp: '163'
    }
  }

  try {
    // 1. 检查所有站点状态
    const checkResults = await Promise.all(
      config.sitesToCheck.map(async site => {
        try {
          const response = await fetch(site.url, {
            headers: { 'User-Agent': 'Cloudflare Worker Monitoring' }
          })
          return {
            name: site.name,
            status: response.status,
            ok: response.ok,
            url: site.url
          }
        } catch (error) {
          return {
            name: site.name,
            status: 'Error',
            error: error.message,
            url: site.url
          }
        }
      })
    )

    // 2. 生成报告内容
    const reportContent = checkResults.map(result => 
      `[${result.name}] ${result.ok ? '✅' : '❌'} 状态: ${result.status || '无响应'}\nURL: ${result.url}`
    ).join('\n\n')

    // 3. 发送邮件报告
    const mailUrl = new URL(config.mailApi)
    Object.entries({
      ...config.mailParams,
      content: encodeURIComponent(reportContent),
      title: encodeURIComponent(`${new Date().toLocaleString()} 站点状态报告`)
    }).forEach(([key, value]) => {
      mailUrl.searchParams.append(key, value)
    })

    const mailResponse = await fetch(mailUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Charset': 'utf-8'
      }
    })

    // 4. 处理邮件响应
    const buffer = await mailResponse.arrayBuffer()
    const decoder = new TextDecoder('utf-8')
    const mailResult = decoder.decode(buffer)

    // 5. 返回综合报告
    return new Response(JSON.stringify({
      success: true,
      checkResults,
      mailResponse: mailResult.includes('成功') ? '邮件发送成功' : mailResult,
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
        'X-Worker-Version': '2.0'
      }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json; charset=utf-8'
      }
    })
  }
}