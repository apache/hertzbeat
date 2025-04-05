---
id: dahua
title: 监控 大华设备
sidebar_label: 大华
keywords: [ monitor, dahua, 大华 ]
---

> 通过HTTP接口监控大华设备状态，获取设备健康数据。

## 监控配置参数

| 参数名称      | 参数帮助描述 |
| ----------- | ----------- |
| 监控Host     | 被监控的对端IP或域名 |
| 监控名称     | 标识此监控的唯一名称 |
| 端口        | 网络请求端口，默认80 |
| 超时时间 | 请求超时时间，单位毫秒 |
| 用户名      | 设备登录用户名 |
| 密码        | 设备登录密码 |
| 启用HTTPS   | 是否启用HTTPS协议 |
| 采集间隔    | 数据采集周期（≥30秒） |

## 采集指标

### 网络信息

- 默认网卡
- 域名
- 主机名
- 网卡 eth0 IP地址
- 网卡 eth0 默认网关
- 网卡 eth0 物理地址
- 网卡 eth0 子网掩码
- 网卡 eth0 MTU
- DNS服务器1/2

### 用户信息

- 客户端地址
- 客户端用户
- 客户端登录类型
- 客户端登录时间

### 校时信息

- 校时服务器
- 校时端口
- 校时间隔

## 实现原理

通过大华设备HTTP接口获取数据：

1. 网络信息：`/cgi-bin/configManager.cgi?action=getConfig&name=Network`

2. 用户信息：`/cgi-bin/userManager.cgi?action=getActiveUserInfoAll`

3. 校时信息：`/cgi-bin/configManager.cgi?action=getConfig&name=NTP`

使用Digest认证方式，解析设备返回的配置数据格式。
