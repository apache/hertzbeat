---
id: extend-telnet  
title: Telnet协议自定义监控  
sidebar_label: Telnet协议自定义监控
---

> 从[自定义监控](extend-point)了解熟悉了怎么自定义类型，指标，协议等，这里我们来详细介绍下用Telnet协议自定义指标监控。
> 使用 Telnet 协议自定义监控可以让我们通过编写 Telnet 命令脚本来监控和采集我们想要监控的 Linux 指标

### Telnet协议采集流程

【**系统直连Linux**】->【**运行TELNET命令脚本语句**】->【**响应数据解析**】->【**指标数据提取**】

由流程可见，我们自定义一个Telnet协议的监控类型，需要配置Telnet请求参数，配置获取哪些指标，配置查询脚本语句。

### 数据解析方式

通过配置监控模板YML的指标field, aliasFields, telnet 协议下的获取数据映射。

### 自定义步骤

**HertzBeat页面** -> **监控模板菜单** -> **新增监控类型** -> **配置自定义监控模板YML** -> **点击保存应用** -> **使用新监控类型添加监控**

![HertzBeat](/img/docs/advanced/extend-point-1.png)

-------

下面详细介绍下文件的配置用法，请注意看使用注释。

### 监控模板YML

> 监控配置定义文件用于定义 *监控类型的名称(国际化), 请求参数结构定义(前端页面根据配置自动渲染UI), 采集指标信息, 采集协议配置* 等。
> 即我们通过自定义这个YML，配置定义什么监控类型，前端页面需要输入什么参数，采集哪些性能指标，通过什么协议去采集。

样例：自定义一个名称为zookeeper的自定义监控类型，其使用telnet协议采集指标数据。

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
