addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  try {
    // 1. 访问目标API仅获取状态码
    const apiUrl = 'https://xzdx.top/api/duan/'
    const apiResponse = await fetch(apiUrl)
    
    // 2. 准备邮件内容（仅包含状态码）
    const status = `网站状态码: ${apiResponse.status}`
    
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
    
    // 4. 发送邮件
    const mailResponse = await fetch(`${mailUrl}?${params.toString()}`)
    const mailResult = await mailResponse.text()
    
    // 5. 返回简化响应
    return new Response(JSON.stringify({
      statusCode: apiResponse.status,
      mailSent: mailResult.includes('成功') // 假设返回内容包含"成功"表示发送成功
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (error) {
    // 错误处理
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}