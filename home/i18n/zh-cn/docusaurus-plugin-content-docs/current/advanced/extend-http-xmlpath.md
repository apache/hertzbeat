---
id: extend-http-xmlpath
title: HTTP 协议 XmlPath 解析方法
sidebar_label: XmlPath 解析方法
---

> 调用 HTTP API 获取响应数据后，使用 XmlPath 脚本解析方法解析响应数据。

注意⚠️ 响应数据必须是 XML 格式。

**使用 XPath 脚本将响应数据解析为符合 HertzBeat 指定的数据结构规则的数据。**

### XmlPath 解析逻辑

HertzBeat 中的 XmlPath 解析方法使用两步 XPath 处理：

1. **主 XPath 表达式 (`parseScript`)**: 此 XPath 表达式在 `http` 配置部分的 `parseScript` 中定义。它用于从响应中选择一个或多个主要的 XML 节点。每个选中的节点将对应 HertzBeat 中的一行指标数据。
2. **相对字段 XPath 表达式 (`xpath`)**: 对于在 `fields` 列表中定义的每个指标字段，您可以指定一个相对的 `xpath`。此 XPath 表达式是*相对于*步骤 1 中 `parseScript` 选择的每个主节点进行评估的。它从当前主节点中提取该指标字段的具体值。

这使您可以轻松地解析包含多个记录或项目的结构化 XML 数据。

**特殊指标**:

* `responseTime`: 这个内置指标代表 HTTP 请求的响应时间，是自动收集的。它不需要 `xpath`。

* `keyword`: 这个内置指标计算原始响应体中指定关键字（在 `http.keyword` 中配置）的出现次数。它不需要 `xpath`。

### 示例

假设 HTTP API 返回以下 XML 数据：

```xml
<DeviceStatus xmlns="http://www.isapi.org/ver20/XMLSchema" version="2.0">
    <CPUList>
        <CPU>
            <cpuUtilization>36.400002</cpuUtilization>
        </CPU>
    </CPUList>
    <MemoryList>
        <Memory>
            <memoryUsage>399640</memoryUsage>
            <memoryAvailable>98792</memoryAvailable>
            <cacheSize>228492</cacheSize>
        </Memory>
    </MemoryList>
    <NetPortStatusList>
        <NetPortStatus>
            <id>1</id>
            <workSpeed>1000</workSpeed>
        </NetPortStatus>
        <NetPortStatus>
            <id>2</id>
            <workSpeed>0</workSpeed>
        </NetPortStatus>
    </NetPortStatusList>
    <bootTime>2025-01-06 10:27:48</bootTime>
    <deviceUpTime>87天0时55分59秒</deviceUpTime>
    <lastCalibrationTime>2025-04-03 11:09:18</lastCalibrationTime>
    <lastCalibrationTimeDiff>1</lastCalibrationTimeDiff>
    <uploadTimeConsumingList>
        <avgTime>16</avgTime>
        <maxTime>23</maxTime>
        <minTime>12</minTime>
    </uploadTimeConsumingList>
    <lastCalibrationTimeMode>NTP</lastCalibrationTimeMode>
    <lastCalibrationTimeAddress>34.191.45.101</lastCalibrationTimeAddress>
</DeviceStatus>
```

我们想要监控设备状态并提取各种指标。

以下是您将如何配置监控模板 YML：

```yaml
category: server
# The monitoring type eg: linux windows tomcat mysql aws...
app: hikvision_isapi
# The monitoring i18n name
name:
  zh-CN: 海康威视 ISAPI
  en-US: Hikvision ISAPI
# The description and help of this monitoring type
help:
  zh-CN: 通过ISAPI接口监控海康威视设备状态，获取设备健康数据。
  en-US: Monitor Hikvision devices through ISAPI interface to collect health data.

# Input params define for monitoring(render web ui by the definition)
params:
  - field: host
    name:
      zh-CN: 主机Host
      en-US: Host
    type: host
    required: true
  - field: port
    name:
      zh-CN: 端口
      en-US: Port
    type: number
    range: '[0,65535]'
    required: true
    defaultValue: 80
  - field: timeout
    name:
      zh-CN: 超时时间(ms)
      en-US: Timeout(ms)
    type: number
    range: '[1000,60000]'
    required: true
    defaultValue: 5000
  - field: username
    name:
      zh-CN: 用户名
      en-US: Username
    type: text
    required: true
  - field: password
    name:
      zh-CN: 密码
      en-US: Password
    type: password
    required: true
  - field: ssl
    name:
      zh-CN: 启用HTTPS
      en-US: SSL
    type: boolean
    required: false
    defaultValue: false

# collect metrics config list
metrics:
  - name: system_info
    i18n:
      zh-CN: 系统信息
      en-US: System Info
    priority: 0
    protocol: http
    http:
      host: ^_^host^_^
      port: ^_^port^_^
      ssl: ^_^ssl^_^
      url: /ISAPI/System/deviceInfo
      method: GET
      timeout: ^_^timeout^_^
      authorization:
        type: Digest Auth
        digestAuthUsername: ^_^username^_^
        digestAuthPassword: ^_^password^_^
      parseType: xmlPath
      parseScript: //DeviceInfo
    fields:
      - field: deviceName
        type: 1
        i18n:
          zh-CN: 设备名称
          en-US: Device Name
      - field: deviceID
        type: 1
        i18n:
          zh-CN: 设备ID
          en-US: Device ID
      - field: firmwareVersion
        type: 1
        i18n:
          zh-CN: 固件版本
          en-US: Firmware Version
      - field: model
        type: 1
        i18n:
          zh-CN: 设备型号
          en-US: Device Model
      - field: macAddress
        type: 1
        i18n:
          zh-CN: mac地址
          en-US: Mac Address
  - name: status
    i18n:
      zh-CN: 设备状态
      en-US: Status
    priority: 0
    protocol: http
    http:
      host: ^_^host^_^
      port: ^_^port^_^
      ssl: ^_^ssl^_^
      url: /ISAPI/System/status
      method: GET
      timeout: ^_^timeout^_^
      authorization:
        type: Digest Auth
        digestAuthUsername: ^_^username^_^
        digestAuthPassword: ^_^password^_^
      parseType: xmlPath
      parseScript: //DeviceStatus
    fields:
      - field: CPU_utilization
        i18n:
          zh-CN: CPU 利用率
          en-US: CPU Utilization
        type: 0
        unit: '%'
      - field: memory_usage
        i18n:
          zh-CN: 内存使用量
          en-US: Memory Usage
        type: 0
        unit: MB
      - field: memory_available
        i18n:
          zh-CN: 可用内存
          en-US: Memory Available
        type: 0
        unit: MB
      - field: cache_size
        i18n:
          zh-CN: 缓存大小
          en-US: Cache Size
        type: 0
        unit: MB
      - field: net_port_1_speed
        i18n:
          zh-CN: 网口1速度
          en-US: Net Port 1 Speed
        type: 0
        unit: Mbps
      - field: net_port_2_speed
        i18n:
          zh-CN: 网口2速度
          en-US: Net Port 2 Speed
        type: 0
        unit: Mbps
      - field: boot_time
        i18n:
          zh-CN: 启动时间
          en-US: Boot Time
        type: 1
      - field: device_uptime
        i18n:
          zh-CN: 运行时长
          en-US: Device Uptime
        type: 1
      - field: last_calibration_time
        i18n:
          zh-CN: 上次校时时间
          en-US: Last Calibration Time
        type: 1
      - field: last_calibration_time_diff
        i18n:
          zh-CN: 上次校时时间差
          en-US: Last Calibration Time Diff
        type: 0
        unit: s
      - field: avg_upload_time
        i18n:
          zh-CN: 平均上传耗时
          en-US: Avg Upload Time
        type: 0
        unit: ms
      - field: max_upload_time
        i18n:
          zh-CN: 最大上传耗时
          en-US: Max Upload Time
        type: 0
        unit: ms
      - field: min_upload_time
        i18n:
          zh-CN: 最小上传耗时
          en-US: Min Upload Time
        type: 0
        unit: ms
      - field: last_calibration_mode
        i18n:
          zh-CN: 上次校时模式
          en-US: Last Calibration Mode
        type: 1
      - field: last_calibration_address
        i18n:
          zh-CN: 上次校时地址
          en-US: Last Calibration Address
        type: 1
      - field: response_time
        i18n:
          zh-CN: 响应时间
          en-US: Response Time
        type: 0
        unit: ms
    aliasFields:
      - CPUList/CPU/cpuUtilization
      - MemoryList/Memory/memoryUsage
      - MemoryList/Memory/memoryAvailable
      - MemoryList/Memory/cacheSize
      - NetPortStatusList/NetPortStatus[id='1']/workSpeed
      - NetPortStatusList/NetPortStatus[id='2']/workSpeed
      - bootTime
      - deviceUpTime
      - lastCalibrationTime
      - lastCalibrationTimeDiff
      - uploadTimeConsumingList/avgTime
      - uploadTimeConsumingList/maxTime
      - uploadTimeConsumingList/minTime
      - lastCalibrationTimeMode
      - lastCalibrationTimeAddress
      - responseTime
    calculates:
      - CPU_utilization=CPUList/CPU/cpuUtilization
      - memory_usage=MemoryList/Memory/memoryUsage
      - memory_available=MemoryList/Memory/memoryAvailable
      - cache_size=MemoryList/Memory/cacheSize
      - net_port_1_speed=NetPortStatusList/NetPortStatus[id='1']/workSpeed
      - net_port_2_speed=NetPortStatusList/NetPortStatus[id='2']/workSpeed
      - boot_time=bootTime
      - device_uptime=deviceUpTime
      - last_calibration_time=lastCalibrationTime
      - last_calibration_time_diff=lastCalibrationTimeDiff
      - avg_upload_time=uploadTimeConsumingList/avgTime
      - max_upload_time=uploadTimeConsumingList/maxTime
      - min_upload_time=uploadTimeConsumingList/minTime
      - last_calibration_mode=lastCalibrationTimeMode
      - last_calibration_address=lastCalibrationTimeAddress
      - response_time=responseTime
    units:
      - memory_usage=KB->MB
      - memory_available=KB->MB
      - cache_size=KB->MB
