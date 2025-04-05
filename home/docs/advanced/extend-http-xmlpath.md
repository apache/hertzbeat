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
  - name: status
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
      parseScript: 'DeviceStatus'
    fields:
      - field: cpuUtilization
        i18n:
          zh-CN: CPU 利用率
          en-US: CPU Utilization
        type: 0
        unit: '%'
        xpath: CPUList/CPU/cpuUtilization
      - field: memoryUsage
        i18n:
          zh-CN: 内存使用量
          en-US: Memory Usage
        type: 0
        unit: MB
        xpath: MemoryList/Memory/memoryUsage
      - field: memoryAvailable
        i18n:
          zh-CN: 可用内存
          en-US: Memory Available
        type: 0
        unit: MB
        xpath: MemoryList/Memory/memoryAvailable
      - field: cacheSize
        i18n:
          zh-CN: 缓存大小
          en-US: Cache Size
        type: 0
        unit: MB
        xpath: MemoryList/Memory/cacheSize
      - field: netPort1Speed
        i18n:
          zh-CN: 网口1速度
          en-US: Net Port 1 Speed
        type: 0
        unit: Mbps
        xpath: NetPortStatusList/NetPortStatus[id='1']/workSpeed
      - field: netPort2Speed
        i18n:
          zh-CN: 网口2速度
          en-US: Net Port 2 Speed
        type: 0
        unit: Mbps
        xpath: NetPortStatusList/NetPortStatus[id='2']/workSpeed
      - field: bootTime
        i18n:
          zh-CN: 启动时间
          en-US: Boot Time
        type: 1
        xpath: bootTime
      - field: deviceUpTime
        i18n:
          zh-CN: 运行时长
          en-US: Device Uptime
        type: 1
        xpath: deviceUpTime
      - field: lastCalibrationTime
        i18n:
          zh-CN: 上次校时时间
          en-US: Last Calibration Time
        type: 1
        xpath: lastCalibrationTime
      - field: lastCalibrationTimeDiff
        i18n:
          zh-CN: 上次校时时间差
          en-US: Last Calibration Time Diff
        type: 0
        unit: s
        xpath: lastCalibrationTimeDiff
      - field: avgUploadTime
        i18n:
          zh-CN: 平均上传耗时
          en-US: Avg Upload Time
        type: 0
        unit: ms
        xpath: uploadTimeConsumingList/avgTime
      - field: maxUploadTime
        i18n:
          zh-CN: 最大上传耗时
          en-US: Max Upload Time
        type: 0
        unit: ms
        xpath: uploadTimeConsumingList/maxTime
      - field: minUploadTime
        i18n:
          zh-CN: 最小上传耗时
          en-US: Min Upload Time
        type: 0
        unit: ms
        xpath: uploadTimeConsumingList/minTime
      - field: lastCalibrationMode
        i18n:
          zh-CN: 上次校时模式
          en-US: Last Calibration Mode
        type: 1
        xpath: lastCalibrationTimeMode
      - field: lastCalibrationAddress
        i18n:
          zh-CN: 上次校时地址
          en-US: Last Calibration Address
        type: 1
        xpath: lastCalibrationTimeAddress
      - field: responseTime
        i18n:
          zh-CN: 响应时间
          en-US: Response Time
        type: 0
        unit: ms
    units:
      - memoryUsage=KB->MB
      - memoryAvailable=KB->MB
      - cacheSize=KB->MB
