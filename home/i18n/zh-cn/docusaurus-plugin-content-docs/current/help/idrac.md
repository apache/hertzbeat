---
id: idrac  
title: iDRAC 监控  
sidebar_label: Server 监控  
keywords: [开源监控工具, 开源服务器监控, iDRAC 监控]
---
# Dell iDRAC 监控

Hertzbeat 使用 SNMP 协议对 Dell iDRAC 的通用指标（可用性，系统信息，传感器状态等）进行采集监控。

您可以点击"新建 Dell iDRAC"并进行配置 SNMP 相关参数添加，或者选择"更多操作"，导入已有配置。

## 前提条件

1. 确保安装了 iDRAC 的 Dell 服务器可以从 HertzBeat Collector 访问。
2. 在 iDRAC 界面上启用 SNMP。
3. 根据所使用的 SNMP 版本配置适当的 SNMP 团体字或用户凭证。

## 添加 Dell iDRAC 监控

### 方法一：通过 UI 添加
1. 导航到 HertzBeat 中的"监控"部分。
2. 点击"新建监控"按钮。
3. 从可用的监控类型中选择"Dell iDRAC"。
4. 填写所需的连接参数：
   - **目标Host**：Dell iDRAC 接口的 IP 地址或主机名
   - **端口**：SNMP 端口（默认值：161）
   - **SNMP 版本**：在 SNMPv1、SNMPv2c 或 SNMPv3 之间选择
   - 根据 SNMP 版本的不同，还需要填写其他参数：
     - 对于 SNMPv1/v2c：SNMP 团体字
     - 对于 SNMPv3：用户名、Context Name、认证密码、认证加密方式、隐私密码、隐私加密方式
5. 根据需要设置采集间隔。
6. 点击"添加"创建监控。

### 方法二：批量导入
您也可以使用批量导入功能导入多个 Dell iDRAC 监控：
1. 导航到"监控"部分。
2. 点击"更多操作"并选择"导入"。
3. 准备包含所需 Dell iDRAC 详细信息的导入文件。
4. 上传文件并按照提示完成导入。

## 采集的指标

HertzBeat 从 Dell iDRAC 接口采集各种指标，包括：

### 系统信息
- 全局系统状态
- 系统前面板状态
- 全局存储状态
- 系统电源状态
- 系统运行时间

### 电源供应器
- 索引
- 名称
- 功率 (W)
- 类型
- 状态

### 冷却设备
- 索引
- 名称
- 类型
- 转速 (RPM)
- 状态

### 温度传感器
- 索引
- 名称
- 温度 (°C)
- 状态

### 电压传感器
- 索引
- 名称
- 电压 (V)
- 类型
- 状态

### 内存设备
- 索引
- 名称
- 类型
- 容量 (G)
- 状态

### 处理器
- 索引
- 名称
- 频率 (MHz)
- 家族
- 状态

## 故障排除

1. **连接问题**：
   - 验证 iDRAC IP 地址/主机名是否正确且可访问。
   - 检查 SNMP 端口是否开放且未被防火墙阻止。
   - 确认在 iDRAC 界面上启用了 SNMP。

2. **认证错误**：
   - 对于 SNMPv1/v2c，确保团体字正确。
   - 对于 SNMPv3，验证用户名、认证密码和隐私密码是否正确。
   - 检查认证和隐私加密方法是否与 iDRAC 配置匹配。

3. **未采集到数据**：
   - 验证 iDRAC 固件是否支持所查询的 OID。
   - 检查 HertzBeat 日志中是否有与 SNMP 采集相关的错误信息。

有关扩展 SNMP 监控的更多信息，请参阅 [SNMP 协议文档](https://hertzbeat.apache.org/zh-cn/docs/advanced/extend-snmp)。
