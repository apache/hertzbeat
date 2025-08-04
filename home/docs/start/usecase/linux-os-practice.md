---
id: linux-os-practice
title: Linux 操作系统监控案例
sidebar_label: Linux 操作系统监控案例
---

这篇文章介绍如何使用 Hertzbeat 监控系统对Linux操作系统的通用性能指标进行采集监控，并在文件系统使用率过高时给我们发告警消息。

## HertzBeat 是什么

Apache HertzBeat (incubating)
一个拥有强大自定义监控能力，无需 Agent 的实时监控工具。网站监测，端口可用性，数据库，操作系统，阈值告警，告警通知(邮件微信钉钉飞书)。

github: <https://github.com/apache/hertzbeat>

## 安装

1. `docker` 环境仅需一条命令即可安装

   ```bash
   docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat
   ```

2. 安装成功浏览器访问 `http://ip:1157` 即可开始探索使用，默认账户密码 `admin/hertzbeat`

:::note
生产环境建议完整部署方式,
参考 [Docker Compose 方式安装 HertzBeat](https://hertzbeat.apache.org/docs/start/docker-compose-deploy)
:::

## 监控 Linux 操作系统

### 1. 新增监控

> 系统页面 -> 监控中心 -> 新增监控 -> 操作系统监控 -> Linux 操作系统 -> 新增 Linux 操作系统监控

![HertzBeat](/img/docs/start/linux-os-practice-1.png)

### 2. 配置参数

- **目标Host**：被监控的对端IPV4，IPV6或域名。注意️不带协议头(eg: https://, http://)）
- **端口**：Linux SSH对外提供的端口，默认为 22
- **超时时间**：设置连接的超时时间，单位为毫秒，默认 6000 毫秒
- **复用连接**: 设置 SSH 连接是否复用，默认开启。如果关闭则每次获取信息都会创建一个连接
- **用户名**: SSH 连接用户名
- **密码**: SSH 连接密码，可选

> 更多参数和高级设置请查看帮助文档：[监控：Linux操作系统监控](https://hertzbeat.apache.org/zh-cn/docs/help/linux)

可以使用标签分类来管理任务，如添加`OS=Linux`等相关标签。

![HertzBeat](/img/docs/start/linux-os-practice-2.png)

### 3. 查看监控数据

在监控列表可以查看任务状态，点击这个监控详情可以查看指标数据图表等。

![HertzBeat](/img/docs/start/linux-os-practice-3.png)

![HertzBeat](/img/docs/start/linux-os-practice-4.png)

### 4. 设置阈值规则

这里我们设置一个阈值规则，当**文件系统中某个目录使用率过高**时触发告警。

> 系统页面 -> 阈值规则 -> 新增 -> 新增实时计算阈值
>
> 配置阈值，配置告警表达式-当指标`文件系统使用率`大于等于 `50%` 触发，也支持设置告警级别和通知模板信息等。

![HertzBeat](/img/docs/start/linux-os-practice-5.png)

> 阈值规则还有其它功能可以配置, 比如阈值关联指定监控, 触发次数, 关联标签等等。

最终可以在告警中心看到已触发的告警。

![HertzBeat](/img/docs/start/linux-os-practice-6.png)

### 5. 消息通知

> 系统页面 -> 消息通知 -> 通知媒介 -> 新增接收对象

![HertzBeat](/img/docs/start/linux-os-practice-7.png)

> 系统页面 -> 消息通知 -> 通知策略 -> 新增通知策略 -> 选择接收对象并启用通知

![HertzBeat](/img/docs/start/linux-os-practice-8.png)

当阈值触发后就可以收到对应告警消息，如果没有配置消息通知，也可以在**告警中心**查看告警信息。

----  

## 总结

监控 Linux 操作系统的实践就到这里，当然对 Hertzbeat 来说这个功能只是冰山一角，如果您觉得 Hertzbeat 这个开源项目不错的话欢迎给我们
Star 哦，非常感谢各位的支持！

**Github: <https://github.com/apache/hertzbeat>**
