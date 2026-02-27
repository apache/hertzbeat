---
id: security_model  
title: 安全模型  
sidebar_label: 安全模型
---

:::tip
Apache HertzBeat 是一个高可扩展的系统，其提供用户大量的自定义能力，用户可以通过自定义监控模板，自定义监控器，自定义插件等来对平台增强。在这种情况下，安全性是非常重要的。  
本文档将介绍 Apache HertzBeat 的安全模型。  
这里的安全模型主要涉及用户在扩展过程中需要注意的安全边界，以及如何保证用户的自定义不会对系统造成安全隐患。
:::

## 用户权限安全

Apache HertzBeat 使用 [Sureness](https://github.com/dromara/sureness) 来支撑系统用户安全。

使用 Sureness 提供的 `sureness.yml` 来配置用户账户，角色，API资源等，强烈建议初始用户修改账户密码，具体参考 [账户权限管理](../start/account-modify)

## 监控模板安全

Apache HertzBeat 提供了监控模板功能，用户可以通过配置监控模板里面的自定义脚本来定义监控规则。

脚本类型包含 `SQL` `SHELL` `JMX` `URL` `API` 等，当用户自定义脚本时需要自行保证自定义脚本的安全性，避免脚本中包含恶意代码等。

## 自定义插件安全

Apache HertzBeat 支持用户上传自定义代码插件在多个系统的生命周期下运行，用户需要自行保证自定义插件代码的安全性。

## 自定义采集器安全

Apache HertzBeat 支持用户自定义采集器来个性化采集监控指标等，用户需要自行保证自定义采集器的安全性。

## 其它自定义下的安全约束

Apache HertzBeat 提供多种系统扩展方式和自定义能力，用户在使用过程中需注意自定义的安全性。当然所有扩展能力都是需在认证用户范围。

----

## Reporting a Vulnerability

Please do not file GitHub issues for security vulnerabilities as they are public!

To report a new vulnerability you have discovered please follow the [ASF vulnerability reporting process](https://apache.org/security/#reporting-a-vulnerability).
