addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  // 配置信息（建议使用环境变量）
  const config = {
    targetUrl: 'https://xzdx.top/api/duan/',
    mailApi: 'https://zyj.22web.org/mail.php',
    mailParams: {
      to: 'jusuvip@163.com',
      title: '网站状态报告',
      user: 'jusuvip@163.com',
      pass: '408065802l',
      smtp: '163'
    }
  }

  try {
    // 1. 获取目标网站状态
    const apiResponse = await fetch(config.targetUrl)
    const status = `网站状态码: ${apiResponse.status}`
    
    // 2. 构建邮件请求URL
    const mailUrl = new URL(config.mailApi)
    Object.entries({...config.mailParams, content: status}).forEach(([key, value]) => {
      mailUrl.searchParams.append(key, value)
    })
    const fullMailUrl = mailUrl.toString()
    
    // 3. 发送邮件请求（添加必要的头信息）
    const mailResponse = await fetch(fullMailUrl, {
      headers: {
        'User-Agent': 'Cloudflare Worker',
        'Accept': 'text/html'
      }
    })
    
    // 4. 检查响应是否为JavaScript挑战
    const mailResult = await mailResponse.text()
    const isJsChallenge = mailResult.includes('aes.js') && mailResult.includes('slowAES.decrypt')
    
    // 5. 返回响应
    return new Response(JSON.stringify({
      websiteStatus: apiResponse.status,
      mailApiUrl: fullMailUrl,
      mailApiResponse: isJsChallenge ? "收到JS挑战响应" : mailResult,
      isJavaScriptChallenge: isJsChallenge,
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: { 
        'Content-Type': 'application/json',
        'X-Worker-Version': '1.3'
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