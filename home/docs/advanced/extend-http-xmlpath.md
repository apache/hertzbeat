---
id: extend-http-xmlpath
title: HTTP Protocol XmlPath Parsing Method
sidebar_label: XmlPath Parsing Method
---

> After calling the HTTP API to obtain the response data, use the XmlPath script parsing method to parse the response data.

Note⚠️ The response data must be in XML format.

**Use XPath scripts to parse the response data into data that conforms to the data structure rules specified by HertzBeat.**

### XmlPath Parsing Logic

The XmlPath parsing method in HertzBeat uses a two-step XPath process:

1. **Main XPath Expression (`parseScript`)**: This XPath expression is defined in the `http` configuration section under `parseScript`. It is used to select one or more main XML nodes from the response. Each selected node will correspond to one row of metric data in HertzBeat.
2. **Relative Field XPath Expressions (`xpath`)**: For each metric field defined in the `fields` list, you can specify a relative `xpath`. This XPath expression is evaluated *relative to each main node* selected by the `parseScript` in step 1. It extracts the specific value for that metric field from the current main node.

This allows you to easily parse structured XML data where multiple records or items are present.

**Special Metrics**:

* `responseTime`: This built-in metric represents the HTTP request's response time and is automatically collected. It does not require an `xpath`.

* `keyword`: This built-in metric counts the occurrences of a specified keyword (configured in `http.keyword`) in the raw response body. It does not require an `xpath`.

### Example

Assume the HTTP API returns the following XML data:

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

We want to monitor the device status and extract various metrics.

Here's how you would configure the monitoring template YML:

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
