---
id: custom-config  
title: 常见参数配置           
sidebar_label: 常见参数配置
---

这里描述了如何配置告警自定义参数等。

**`hertzbeat`的配置文件`application.yml`**

配置HertzBeat的配置文件

- 修改位于 `hertzbeat/config/application.yml` 的配置文件
- **Docker部署：** ⚠️docker容器方式需要将 `application.yml` 文件挂载到主机本地
- **安装包方式：** 解压修改位于 `hertzbeat/config/application.yml` 的配置文件即可

## 0. 虚拟线程配置

虚拟线程的默认值、调优建议、回滚方式，以及 Docker/安装包对应的配置文件位置，已经单独整理到文档页：

- [虚拟线程配置说明](./virtual-thread)

## 1. 配置告警自定义参数

```yaml
alerter:
  # 自定义控制台地址
  console-url: https://console.tancloud.io
```

## 2. 使用外置redis代替内存存储实时指标数据

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
