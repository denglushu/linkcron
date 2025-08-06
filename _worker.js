addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // 配置信息（建议使用环境变量）
  const config = {
    targetUrls: [
      { name: '短链接API', url: 'https://xzdx.top/api/duan/' },
      { name: '长转短API', url: 'https://www.ffapi.cn/int/v1/longdwz' },
      { name: 'IP查询API', url: 'https://api.janelink.cn/api/ip.php' }
    ],
    mailApi: 'https://zyj.22web.org/mail.php',
    mailParams: {
      to: 'jusuvip@163.com',
      title: '多网站状态报告',
      user: 'jusuvip@163.com',
      pass: '408065802l',
      smtp: '163'
    }
  }

  try {
    // 1. 检查所有目标网站状态
    const statusResults = await Promise.all(config.targetUrls.map(async (site) => {
      try {
        const response = await fetch(site.url, { timeout: 5000 })
        return {
          name: site.name,
          url: site.url,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        }
      } catch (error) {
        return {
          name: site.name,
          url: site.url,
          status: 'ERROR',
          statusText: error.message,
          ok: false
        }
      }
    }))

    // 2. 生成邮件内容
    const mailContent = statusResults.map(result => 
      `【${result.name}】\nURL: ${result.url}\n状态: ${result.ok ? '正常' : '异常'}\n状态码: ${result.status}\n详情: ${result.statusText}\n\n`
    ).join('')

    // 3. 构建邮件请求URL
    const mailUrl = new URL(config.mailApi)
    Object.entries({...config.mailParams, content: mailContent}).forEach(([key, value]) => {
      mailUrl.searchParams.append(key, value)
    })

    // 4. 发送邮件请求
    const mailResponse = await fetch(mailUrl.toString(), {
      headers: {
        'User-Agent': 'Cloudflare Worker',
        'Accept': 'text/html'
      }
    })
    
    // 5. 检查邮件响应是否为JS挑战
    const mailResult = await mailResponse.text()
    const isJsChallenge = mailResult.includes('aes.js') && mailResult.includes('slowAES.decrypt')
    
    // 6. 返回响应
    return new Response(JSON.stringify({
      statusChecks: statusResults,
      mailApiUrl: mailUrl.toString(),
      mailApiResponse: isJsChallenge ? "收到JS挑战响应" : mailResult,
      isJavaScriptChallenge: isJsChallenge,
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Worker-Version': '1.4'
      }
    })
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}