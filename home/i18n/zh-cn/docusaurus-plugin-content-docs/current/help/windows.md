---
id: windows  
title: 监控：Windows操作系统监控      
sidebar_label: Windows操作系统       
keywords: [开源监控系统, 开源操作系统监控, Windows操作系统监控]
---

> 通过SNMP协议对Windows操作系统的通用性能指标进行采集监控。
> 注意⚠️ Windows服务器需开启SNMP服务  

参考资料:      
[什么是SNMP协议1](https://www.cnblogs.com/xdp-gacl/p/3978825.html)   
[什么是SNMP协议2](https://www.auvik.com/franklyit/blog/network-basics-what-is-snmp/)     
[Win配置SNMP英文](https://docs.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-snmp-service)     
[Win配置SNMP中文](https://docs.microsoft.com/zh-cn/troubleshoot/windows-server/networking/configure-snmp-service)   

### 配置参数

| 参数名称      | 参数帮助描述 |
| ----------- | ----------- |
| 监控Host     | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称     | 标识此监控的名称，名称需要保证唯一性。  |
| 端口        | Windows SNMP服务对外提供的端口，默认为 161。  |
| SNMP 版本   | SNMP协议版本 V1 V2c V3 |
| SNMP 团体字 | SNMP 协议团体名(Community Name)，用于实现SNMP网络管理员访问SNMP管理代理时的身份验证。类似于密码，默认值为 public |
| 超时时间    | 协议连接超时时间 |
| 采集间隔    | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒  |
| 是否探测    | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作  |
| 描述备注    | 更多标识和描述此监控的备注信息，用户可以在这里备注信息  |

### 采集指标

#### 指标集合：system

| 指标名称      | 指标单位 | 指标帮助描述 |
| ----------- | ----------- | ----------- |
| name          | 无 | 主机名称 |
| descr         | 无 | 操作系统描述 |
| uptime        | 无 | 系统运行时间 |
| numUsers      | 个数 | 当前用户数 |
| services      | 个数 | 当前服务数量 |
| processes     | 个数 | 当前进程数量 |
| responseTime  | ms | 采集响应时间 |
