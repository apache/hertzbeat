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

> 下列管理自定义能力仅面向已获批准的管理员。

## 用户权限安全

出于安全考虑，结合目前的权限管理情况，1.9.1 取消了 user 和 guest 角色，仅保留 admin。即使旧 sureness.yml 中仍配置这些角色，原账号也无法登录。管理员需手动编辑实际使用的 sureness.yml，仅将可信账号设置为 `role: [admin]`，重启后重新登录。支持多个不同用户名的 admin 账号；admin 拥有平台全部管理权限，请谨慎分配。系统不会自动提权或删除原账号。

从 1.9.1 起，管理面仅支持 admin，这是有意的权限兼容性变更。旧 user/guest/自定义账号不会自动提权，部署方必须确认可信管理者后手动授予 admin；不授予者不得继续访问管理面。升级前请阅读[权限迁移要求](./admin_only_migration)及[账号配置](../start/account-modify)，可先在测试环境验证。

admin 是全实例可信管理者，平台不承诺管理员之间的资源或凭据隔离。认证、防止未授权访问、已有秘密掩码及其他明确安全限制仍然保留；不能据此豁免秘密泄露或宣称旧漏洞不存在。公开和机器接入例外仅保留文档中列明的原有政策。

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
