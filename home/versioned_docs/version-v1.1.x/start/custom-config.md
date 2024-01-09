---
id: custom-config  
title: 常见参数配置           
sidebar_label: 常见参数配置      
---

这里描述了如果配置短信服务器，内置可用性告警触发次数等。

**`hertzbeat`的配置文件`application.yml`**     

### 配置HertzBeat的配置文件    
   修改位于 `hertzbeat/config/application.yml` 的配置文件    
   注意⚠️docker容器方式需要将application.yml文件挂载到主机本地   
   安装包方式解压修改位于 `hertzbeat/config/application.yml` 即可     

1. 配置短信发送服务器

> 只有成功配置了您自己的短信服务器，监控系统内触发的告警短信才会正常发送。  

在`application.yml`新增如下腾讯平台短信服务器配置(参数需替换为您的短信服务器配置)  
```yaml
common:
  sms:
    tencent:
      secret-id: AKIDbQ4VhdMr89wDedFrIcgU2PaaMvOuBCzY
      secret-key: PaXGl0ziY9UcWFjUyiFlCPMr77rLkJYlyA
      app-id: 1435441637
      sign-name: 赫兹跳动
      template-id: 1343434
```

2. 配置告警自定义参数  

> 如果您收到频繁的内置可用性告警，或在您所在网络抖动厉害，建议调整以下参数 

```yaml
alerter:
  # 自定义控制台地址
  console-url: https://console.tancloud.cn
  # 告警触发评估间隔基础时间，相同重复告警在2倍此时间内不会被重复连续触发 单位毫秒
  alert-eval-interval-base: 600000
  # 告警触发评估间隔最大时间，相同重复告警最多在此时间段被抑制 单位毫秒
  max-alert-eval-interval: 86400000
  # 内置可用性告警连续触发几次才会真正发送告警 默认1次，当网络环境不好，不想频繁收到可用性告警时，可将此值调大(3)  
  system-alert-trigger-times: 1
```

3. 使用外置redis代替内存存储实时指标数据  

> 默认我们的指标实时数据存储在内存中，可以配置如下来使用redis代替内存存储。 

注意⚠️ `memory.enabled: false, redis.enabled: true` 
```yaml
warehouse:
  store:
    memory:
      enabled: false
      init-size: 1024
    redis:
      enabled: true
      host: 127.0.0.1
      port: 6379
      password: 123456
```
