addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  try {
    // 1. 访问目标API仅获取状态码
    const apiUrl = 'https://xzdx.top/api/duan/'
    const apiResponse = await fetch(apiUrl)
    const statusCode = apiResponse.status
    
    // 2. 准备邮件内容
    const status = `网站状态码: ${statusCode}`
    
    // 3. 配置邮件发送参数
    const mailUrl = 'https://zyj.22web.org/mail.php'
    const params = new URLSearchParams({
      to: 'jusuvip@163.com',
      title: '网站状态报告',
      content: status,
      user: 'jusuvip@163.com',
      pass: '408065802l',
      smtp: '163'
    })
    
    // 构建完整URL（用于输出）
    const fullMailUrl = `${mailUrl}?${params.toString()}`
    
    // 4. 发送邮件
    const mailResponse = await fetch(fullMailUrl)
    const mailResult = await mailResponse.text()
    
    // 5. 返回响应（包含完整URL）
    return new Response(JSON.stringify({
      websiteStatus: statusCode,
      mailApiUrl: fullMailUrl,  // 完整邮件接口URL
      mailApiResponse: mailResult,
      timestamp: new Date().toISOString()
    }, null, 2), {  // 使用2空格缩进美化JSON输出
      headers: { 
        'Content-Type': 'application/json',
        'X-Worker-Version': '1.2'
      }
    })
    
  } catch (error) {
    // 错误处理（也包含URL信息）
    return new Response(JSON.stringify({
      error: error.message,
      attemptedMailUrl: fullMailUrl || '未生成',
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}