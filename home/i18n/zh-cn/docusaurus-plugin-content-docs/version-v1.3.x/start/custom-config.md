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
1.1 腾讯云短信创建签名（sign-name）
![image](https://github.com/dromara/hertzbeat/assets/40455946/3a4c287d-b23d-4398-8562-4894296af485)

1.2 腾讯云短信创建正文模板（template-id）
```
监控:{1}，告警级别:{2}。内容:{3}
```
![image](https://github.com/dromara/hertzbeat/assets/40455946/face71a6-46d5-452c-bed3-59d2a975afeb)


1.3 腾讯云短信创建应用（app-id）
![image](https://github.com/dromara/hertzbeat/assets/40455946/2732d710-37fa-4455-af64-48bba273c2f8)

1.4 腾讯云访问管理（secret-id、secret-key）
![image](https://github.com/dromara/hertzbeat/assets/40455946/36f056f0-94e7-43db-8f07-82893c98024e)


2. 配置告警自定义参数  

```yaml
alerter:
  # 自定义控制台地址
  console-url: https://console.tancloud.cn
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
