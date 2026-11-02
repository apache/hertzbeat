---
id: security_model
title: 安全模型
sidebar_label: 安全模型
---

:::tip
Apache HertzBeat™ 是一个高可扩展的系统，其提供用户大量的自定义能力，用户可以通过自定义监控模板，自定义监控器，自定义插件等来对平台增强。在这种情况下，安全性是非常重要的。
本文档将介绍 Apache HertzBeat™ 的安全模型。
这里的安全模型主要涉及用户在扩展过程中需要注意的安全边界，以及如何保证用户的自定义不会对系统造成安全隐患。
:::

> 下述权限取决于已配置的角色和访问的接口。

## 用户权限安全

Apache HertzBeat™ 使用 [Sureness](https://github.com/dromara/sureness) 来支撑系统用户安全。

使用 Sureness 提供的 `sureness.yml` 来配置用户账户，角色，API资源等，强烈建议初始用户修改账户密码，具体参考 [账户权限管理](../start/account-modify)

随包账号来源最初只包含 `admin`，请修改其默认密码。当前 2.0 开发版没有强制的 admin-only 管理边界：显式配置的 `user`、`guest` 和自定义角色可以访问实际生效的 `sureness.yml` `resourceRole` 规则及接口检查所允许的路由，其中部分 `user` 规则允许写操作。请审查部署配置，只向可信身份授予访问权限；不要假定这些角色提供完整的资源或凭据隔离。

机器上报入口保留各自的策略。例如，随包的 OTLP 和 Alertmanager 规则允许 `user`；这与授予账号完整管理员权限不同。

## 监控模板安全

Apache HertzBeat™ 提供了监控模板功能，用户可以通过配置自定义监控模板和自定义脚本来定义监控规则。

监控模版内包含 `SQL` `SHELL` `JMX` `URL` `API` 等脚本和其它内容，当用户自定义监控模版时需要自行保证模版内容的安全性，避免包含恶意代码等。

## 自定义插件安全

Apache HertzBeat™ 支持用户上传自定义代码插件在多个系统的生命周期下运行，用户需要自行保证自定义插件代码的安全性。

## 自定义采集器安全

Apache HertzBeat™ 支持用户自定义采集器来个性化采集监控指标等，用户需要自行保证自定义采集器的安全性。

## 自定义URL等参数安全

Apache HertzBeat™ 提供自定义参数配置能力，所有被授权配置 URL 等参数的用户都被认为是高度信任的，并且期望他们可以触发某些行为。

## 其它自定义下的安全约束

Apache HertzBeat™ 提供多种系统扩展方式和自定义能力，用户在使用过程中需注意自定义的安全性。当然所有扩展能力都是需在认证用户范围。

----

## Reporting a Vulnerability

Please do not file GitHub issues for security vulnerabilities as they are public!

To report a new vulnerability you have discovered please follow the [ASF vulnerability reporting process](https://apache.org/security/#reporting-a-vulnerability).
