---
id: extend-push 
title: Push Style Custom Monitoring  
sidebar_label: Push Style Custom Monitoring
---

> 推送方式监控是一种特殊的监控，允许用户配置数据格式并编写代码将指标推送到 Hertzbeat。
> 下面我们将介绍如何使用这一功能。

### 推送方式监控的采集流程

【用户开始推送数据】->【HertzBeat推送模块暂存数据】->【HertzBeat采集模块定期采集数据】

### 数据解析方式

HertzBeat会使用用户添加新监控时配置的格式来解析数据。

### 创建监控步骤

HertzBeat页面 -> 应用服务监控 -> 推送方式监控 -> 新建推送方式监视器 -> 设置推送模块主机（Hertzbeat服务器ip，通常为127.0.0.1或localhost） -> 设置推送模块端口（hertzbeat服务器端口，通常为1157） -> 配置数据字段（单位：字符串表示，类型：0表示数字/1表示字符串）-> 结束

---

### 监控配置示例

![HertzBeat](/img/docs/advanced/extend-push-example-1.png)
