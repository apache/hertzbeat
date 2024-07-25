---
id: custom-config  
title: Advanced Params Config           
sidebar_label: Advanced Params Config      
---

This describes how to configure the SMS server, the number of built-in availability alarm triggers, etc.

**Configuration file `application.yml` of `hertzbeat`**

### Configure the configuration file of HertzBeat

Modify the configuration file located at `hertzbeat/config/application.yml`    
Note ⚠️The docker container method needs to mount the application.yml file to the local host     
The installation package can be decompressed and modified in `hertzbeat/config/application.yml`    

1. Configure the SMS sending server

> Only when your own SMS server is successfully configured, the alarm SMS triggered in the monitoring tool will be sent normally.

Add the following Tencent platform SMS server configuration in `application.yml` (parameters need to be replaced with your SMS server configuration)  
```yaml
common:
   sms:
     tencent:
       secret-id: AKIDbQ4VhdMr89wDedFrIcgU2PaaMvOuBCzY
       secret-key: PaXGl0ziY9UcWFjUyiFlCPMr77rLkJYlyA
       app-id: 1435441637
       sign-name: XX Technology
       template-id: 1343434
```

2. Configure alarm custom parameters


```yaml
alerter:
   # Custom console address
   console-url: https://console.tancloud.cn
```

3. Use external redis instead of memory to store real-time metric data

> By default, the real-time data of our metrics is stored in memory, which can be configured as follows to use redis instead of memory storage.

Note ⚠️ `memory.enabled: false, redis.enabled: true`
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
