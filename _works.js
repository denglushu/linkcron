addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  try {
    // 1. 访问目标API获取数据
    const apiUrl = 'https://xzdx.top/api/duan/'
    const apiResponse = await fetch(apiUrl)
    const apiData = await apiResponse.text()
    
    // 2. 准备邮件内容
    const status = `网站状态: ${apiResponse.status}, 内容: ${apiData.substring(0, 100)}...`
    
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
    
    // 5. 返回结果
    return new Response(JSON.stringify({
      apiStatus: apiResponse.status,
      mailResult: mailResult
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