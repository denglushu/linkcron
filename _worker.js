addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // 配置信息（生产环境建议使用环境变量）
  const config = {
    sitesToCheck: [
      { name: "短网址API", url: "https://xzdx.top/api/duan/" },
      { name: "FFAPI长短链", url: "https://www.ffapi.cn/int/v1/longdwz" },
      { name: "IP查询接口", url: "https://api.janelink.cn/api/ip.php" }
    ],
    mailApi: 'https://zyj.22web.org/mail.php',
    mailParams: {
      to: 'jusuvip@163.com',
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
            headers: { 'User-Agent': 'Cloudflare Worker' },
            timeout: 5000 // 5秒超时
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
            status: error.message.includes('timed out') ? 504 : 523,
            ok: false,
            url: site.url,
            error: error.message
          }
        }
      })
    )

    // 2. 生成邮件内容
    const statusReport = checkResults.map(result => 
      `[${result.name}] ${result.ok ? '✅' : '❌'} 状态码: ${result.status}\nURL: ${result.url}`
    ).join('\n\n')

    // 3. 发送邮件（使用您已验证的参数格式）
    const mailUrl = new URL(config.mailApi)
    Object.entries({
      ...config.mailParams,
      title: '多站点状态报告',
      content: statusReport
    }).forEach(([key, value]) => {
      mailUrl.searchParams.append(key, value)
    })

    const mailResponse = await fetch(mailUrl.toString(), {
      headers: {
        'User-Agent': 'Cloudflare Worker',
        'Accept': 'text/html'
      }
    })

    // 4. 处理邮件响应
    const mailResult = await mailResponse.text()
    const isJsChallenge = mailResult.includes('aes.js') && mailResult.includes('slowAES.decrypt')

    // 5. 返回综合报告
    return new Response(JSON.stringify({
      success: true,
      checkResults,
      mailApiUrl: mailUrl.toString(),
      mailApiResponse: isJsChallenge ? "收到JS挑战响应" : "邮件已发送",
      isJavaScriptChallenge: isJsChallenge,
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Worker-Version': '2.1'
      }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}