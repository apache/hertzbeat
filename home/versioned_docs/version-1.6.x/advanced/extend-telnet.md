---
id: extend-telnet  
title: Telnet Protocol Custom Monitoring
sidebar_label: Telnet Protocol Custom Monitoring
---

> From [Custom Monitoring](extend-point), you are familiar with how to customize types, Metrics, protocols, etc. Here we will introduce in detail how to use Telnet to customize Metric monitoring.
> Telnet protocol custom monitoring allows us to easily monitor and collect the Linux Metrics we want by writing sh command script.

### Telnet protocol collection process

【**System directly connected to Linux**】->【**Run shell command script statement**】->【**parse response data: oneRow, multiRow**】->【**Metric data extraction**】

It can be seen from the process that we define a monitoring type of Telnet protocol. We need to configure Telnet request parameters, configure which Metrics to obtain, and configure query script statements.

### Data parsing method

By configuring the metrics `field`, `aliasFields` the `Telnet` protocol of the monitoring template YML to capture the data specified by the peer and parse the mapping.

### Custom Steps

**HertzBeat Dashboard** -> **Monitoring Templates** -> **New Template** -> **Config Monitoring Template Yml** -> **Save and Apply** -> **Add A Monitoring with The New Monitoring Type**

![HertzBeat](/img/docs/advanced/extend-point-1.png)

-------

Configuration usages of the monitoring templates yml are detailed below.

### Monitoring Templates YML

> We define all monitoring collection types (mysql,jvm,k8s) as yml monitoring templates, and users can import these templates to support corresponding types of monitoring.
> Monitoring template is used to define *the name of monitoring type(international), request parameter mapping, index information, collection protocol configuration information*, etc.

eg：Define a custom monitoring type `app` named `zookeeper` which use the telnet protocol to collect data.

```yaml
# The monitoring type category：service-application service monitoring db-database monitoring custom-custom monitoring os-operating system monitoring
# 监控类型所属类别：service-应用服务 program-应用程序 db-数据库 custom-自定义 os-操作系统 bigdata-大数据 mid-中间件 webserver-web服务器 cache-缓存 cn-云原生 network-网络监控等等
category: mid
# Monitoring application type(consistent with the file name) eg: linux windows tomcat mysql aws...
# 监控应用类型(与文件名保持一致) eg: linux windows tomcat mysql aws...
app: zookeeper
# The monitoring i18n name
# 监控类型国际化名称
name:
  zh-CN: Zookeeper服务
  en-US: Zookeeper Server
# 监控参数定义. field 这些为输入参数变量，即可以用^_^host^_^的形式写到后面的配置中，系统自动变量值替换
# 强制固定必须参数 - host
params:
  # field-param field key
  # field-字段名称标识符
  - field: host
    # name-param field display i18n name
    # name-参数字段显示名称
    name:
      zh-CN: 主机Host
      en-US: Host
    # type-param field type(most mapping the html input type)
    # type-字段类型,样式(大部分映射input标签type属性)
    type: host
    # required-true or false
    # 是否是必输项 true-必填 false-可选
    required: true
  # field-param field key
  # field-字段名称标识符
  - field: port
    # name-param field display i18n name
    # name-参数字段显示名称
    name:
      zh-CN: 端口
      en-US: Port
    # type-param field type(most mapping the html input type)
    # type-字段类型,样式(大部分映射input标签type属性)
    type: number
    # when type is number, range is required
    # 当type为number时,用range表示范围
    range: '[0,65535]'
    # required-true or false
    # 是否是必输项 true-必填 false-可选
    required: true
    # default
    # 默认值
    defaultValue: 2181
    # param field input placeholder
    # 参数输入框提示信息
    placeholder: '请输入端口'
  # field-param field key
  # field-字段名称标识符
  - field: timeout
    # name-param field display i18n name
    # name-参数字段显示名称
    name:
      zh-CN: 查询超时时间(ms)
      en-US: Query Timeout(ms)
    # type-param field type(most mapping the html input type)
    # type-字段类型,样式(大部分映射input标签type属性)
    type: number
    # required-true or false
    # 是否是必输项 true-必填 false-可选
    required: false
    # hide-is hide this field and put it in advanced layout
    # 隐藏是隐藏这个字段，并把它放在高级布局
    hide: true
    # default
    # 默认值
    defaultValue: 6000
# collect metrics config list
# 采集指标配置列表
metrics:
  # metrics - conf
  # 第一个监控指标 conf
  # 注意：内置监控指标有 (responseTime - 响应时间)
  - name: conf
    # metrics scheduling priority(0->127)->(high->low), metrics with the same priority will be scheduled in parallel
    # priority 0's metrics is availability metrics, it will be scheduled first, only availability metrics collect success will the scheduling continue
    # 指标采集调度优先级(0->127)->(优先级高->低) 优先级低的指标会等优先级高的指标采集完成后才会被调度, 相同优先级的指标会并行调度采集
    # 优先级为0的指标为可用性指标,即它会被首先调度,采集成功才会继续调度其它指标,采集失败则中断调度
    priority: 0
    # collect metrics content
    # 具体监控指标列表
    fields:
      # field-metric name, type-metric type(0-number,1-string), unit-metric unit('%','ms','MB'), label-if is metrics label
      # 指标信息 包括 field名称   type字段类型:0-number数字,1-string字符串   label是否为标签   unit:指标单位
      - field: clientPort
        type: 0
        i18n:
          zh-CN: 客户端端口
          en-US: Client Port
      - field: dataDir
        type: 1
        i18n:
          zh-CN: 数据目录
          en-US: Data Directory
      - field: dataDirSize
        type: 0
        unit: kb
        i18n:
          zh-CN: 数据目录大小
          en-US: Data Directory Size
      - field: dataLogDir
        type: 1
        i18n:
          zh-CN: 日志目录
          en-US: Data Log Directory
      - field: dataLogSize
        type: 0
        unit: kb
        i18n:
          zh-CN: 日志目录大小
          en-US: Data Log Size
      - field: tickTime
        type: 0
        unit: ms
        i18n:
          zh-CN: 心跳间隔时间
          en-US: Tick Time
      - field: maxClientCnxns
        type: 1
        i18n:
          zh-CN: 最大客户端连接数
          en-US: Max Client Connections
      - field: minSessionTimeout
        type: 0
        unit: ms
        i18n:
          zh-CN: 最小会话超时
          en-US: Min Session Timeout
      - field: maxSessionTimeout
        type: 0
        unit: ms
        i18n:
          zh-CN: 最大会话超时
          en-US: Max Session Timeout
      - field: serverId
        type: 0
        i18n:
          zh-CN: 服务器ID
          en-US: Server ID
    # the protocol used for monitoring, eg: sql, ssh, http, telnet, wmi, snmp, sdk
    # 监控采集使用协议 eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: telnet
    # the config content when protocol is telnet
    # 当protocol为telnet协议时具体的采集配置
    telnet:
      # host: ipv4 ipv6 domain
      # 主机host: ipv4 ipv6 域名
      host: ^_^host^_^
      # port
      # 端口
      port: ^_^port^_^
      # timeout
      # 超时时间
      timeout: ^_^timeout^_^
      # telnet instruction
      # telnet指令
      cmd: conf

  - name: stats
    priority: 1
    fields:
      - field: zk_version
        type: 1
        i18n:
          zh-CN: ZooKeeper版本
          en-US: ZooKeeper Version
      - field: zk_server_state
        type: 1
        i18n:
          zh-CN: 服务器状态
          en-US: Server State
      - field: zk_num_alive_connections
        type: 0
        unit: 个
        i18n:
          zh-CN: 存活连接数
          en-US: Number of Alive Connections
      - field: zk_avg_latency
        type: 0
        unit: ms
        i18n:
          zh-CN: 平均延迟
          en-US: Average Latency
      - field: zk_outstanding_requests
        type: 0
        unit: 个
        i18n:
          zh-CN: 未完成请求数
          en-US: Outstanding Requests
      - field: zk_znode_count
        type: 0
        unit: 个
        i18n:
          zh-CN: ZNode数量
          en-US: ZNode Count
      - field: zk_packets_sent
        type: 0
        unit: 个
        i18n:
          zh-CN: 发送数据包数
          en-US: Packets Sent
      - field: zk_packets_received
        type: 0
        unit: 个
        i18n:
          zh-CN: 接收数据包数
          en-US: Packets Received
      - field: zk_watch_count
        type: 0
        unit: 个
        i18n:
          zh-CN: Watch数量
          en-US: Watch Count
      - field: zk_max_file_descriptor_count
        type: 0
        unit: 个
        i18n:
          zh-CN: 最大文件描述符数量
          en-US: Max File Descriptor Count
      - field: zk_approximate_data_size
        type: 0
        unit: kb
        i18n:
          zh-CN: 大致数据大小
          en-US: Approximate Data Size
      - field: zk_open_file_descriptor_count
        type: 0
        unit: 个
        i18n:
          zh-CN: 打开的文件描述符数量
          en-US: Open File Descriptor Count
      - field: zk_max_latency
        type: 0
        unit: ms
        i18n:
          zh-CN: 最大延迟
          en-US: Max Latency
      - field: zk_ephemerals_count
        type: 0
        unit: 个
        i18n:
          zh-CN: 临时节点数量
          en-US: Ephemerals Count
      - field: zk_min_latency
        type: 0
        unit: ms
        i18n:
          zh-CN: 最小延迟
          en-US: Min Latency
    protocol: telnet
    telnet:
      host: ^_^host^_^
      port: ^_^port^_^
      timeout: ^_^timeout^_^
      cmd: mntr

  
```
