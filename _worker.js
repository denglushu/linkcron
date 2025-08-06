addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// 站点检查函数
async function checkSite(url, name) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000 // 10秒超时
    })
    return {
      name,
      status: response.status,
      ok: response.ok,
      url,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      name,
      status: error.message.includes('timed out') ? 504 : 523,
      ok: false,
      url,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

// 邮件发送函数（带重试机制）
async function sendMail(content, config) {
  const mailUrl = new URL(config.mailApi)
  const params = {
    ...config.mailParams,
    title: `${new Date().toLocaleString('zh-CN')} 站点监控报告`,
    content: content
  }
  
  // 参数编码处理
  Object.entries(params).forEach(([key, value]) => {
    mailUrl.searchParams.append(key, encodeURIComponent(value))
  })
  
  // 尝试3次发送
  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(mailUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept-Language': 'zh-CN,zh;q=0.9'
        }
      })
      
      const text = await response.text()
      if (!text.includes('aes.js')) {
        return { success: true, response: text }
      }
    } catch (error) {
      if (i === 2) throw error
      await new Promise(resolve => setTimeout(resolve, 2000)) // 2秒后重试
    }
  }
  throw new Error('邮件发送失败：连续收到JS挑战')
}

async function handleRequest(request) {
  // 配置信息（生产环境应使用环境变量）
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
    // 1. 并行检查所有站点
    const checkPromises = config.sitesToCheck.map(site => 
      checkSite(site.url, site.name)
    )
    const results = await Promise.all(checkPromises)
    
    // 2. 生成可视化报告
    const statusEmoji = status => 
      status >= 200 && status < 300 ? '✅' : 
      status >= 500 ? '🔥' : '⚠️'
    
    const reportContent = results.map(r => 
      `${statusEmoji(r.status)} [${r.name}]\n状态码: ${r.status}\nURL: ${r.url}\n时间: ${new Date(r.timestamp).toLocaleString('zh-CN')}\n${r.error ? '错误: ' + r.error : ''}`
    ).join('\n\n')
    
    // 3. 发送邮件（带重试）
    const mailResult = await sendMail(reportContent, config)
    
    // 4. 返回结构化报告
    return new Response(JSON.stringify({
      success: true,
      sites: results,
      mailStatus: 'sent_successfully',
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
        'X-Monitor-Version': '3.1'
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
      headers: { 'Content-Type': 'application/json' }
    })
  }
}