---
id: extend-jmx
title: JMX Protocol Custom Monitoring
sidebar_label: JMX Protocol Custom Monitoring
---

> From [Custom Monitoring](extend-point), you are familiar with how to customize types, Metrics, protocols, etc. Here we will introduce in detail how to use JMX to customize Metric monitoring.
> JMX protocol custom monitoring allows us to easily monitor Metrics we want by config JMX Mbeans Object.

### JMX protocol collection process

【**Peer Server Enable Jmx Service**】->【**HertzBeat Connect Peer Server Jmx**】->【**Query Jmx Mbean Object Data**】->【**Metric data extraction**】

It can be seen from the process that we define a monitoring type of JMX protocol. We need to configure JMX request parameters, configure which Metrics to obtain, and configure Mbeans Object.

### Data parsing method

By configuring the monitoring template YML metrics `field`, `aliasFields`, `objectName` of the `jmx` protocol to map and parse the `Mbean` object information exposed by the peer system.

### Custom Steps

**HertzBeat Dashboard** -> **Monitoring Templates** -> **New Template** -> **Config Monitoring Template Yml** -> **Save and Apply** -> **Add A Monitoring with The New Monitoring Type**

![HertzBeat](/img/docs/advanced/extend-point-1.png)

-------

Configuration usages of the monitoring templates yml are detailed below.

### Monitoring Templates YML

> We define all monitoring collection types (mysql,jvm,k8s) as yml monitoring templates, and users can import these templates to support corresponding types of monitoring.
>
> Monitoring template is used to define *the name of monitoring type(international), request parameter mapping, index information, collection protocol configuration information*, etc.

eg：Define a custom monitoring type `app` named `example_jvm` which use the JVM protocol to collect data.

```yaml
# The monitoring type category：service-application service monitoring db-database monitoring custom-custom monitoring os-operating system monitoring
category: service
# The monitoring type eg: linux windows tomcat mysql aws...
app: example_jvm
# The monitoring i18n name
name:
  zh-CN: 自定义JVM虚拟机
  en-US: CUSTOM JVM
# Input params define for monitoring(render web ui by the definition)
params:
  # field-param field key
  - field: host
    # name-param field display i18n name
    name:
      zh-CN: 主机Host
      en-US: Host
    # type-param field type(most mapping the html input type)
    type: host
    # required-true or false
    required: true
  # field-param field key
  - field: port
    # name-param field display i18n name
    name:
      zh-CN: 端口
      en-US: Port
    # type-param field type(most mapping the html input type)
    type: number
    # when type is number, range is required
    range: '[0,65535]'
    # required-true or false
    required: true
    # default value
    defaultValue: 9999
  # field-param field key
  - field: url
    # name-param field display i18n name
    name:
      zh-CN: JMX URL
      en-US: JMX URL
    # type-param field type(most mapping the html input type)
    type: text
    # required-true or false
    required: false
    # hide param-true or false
    hide: true
    # param field input placeholder
    placeholder: 'service:jmx:rmi:///jndi/rmi://host:port/jmxrmi'
  # field-param field key
  - field: username
    # name-param field display i18n name
    name:
      zh-CN: 用户名
      en-US: Username
    # type-param field type(most mapping the html input type)
    type: text
    # when type is text, use limit to limit string length
    limit: 50
    # required-true or false
    required: false
    # hide param-true or false
    hide: true
  # field-param field key
  - field: password
    # name-param field display i18n name
    name:
      zh-CN: 密码
      en-US: Password
    # type-param field type(most mapping the html input tag)
    type: password
    # required-true or false
    required: false
    # hide param-true or false
    hide: true
# collect metrics config list
metrics:
  # metrics - basic
  - name: basic
    # metrics scheduling priority(0->127)->(high->low), metrics with the same priority will be scheduled in parallel
    # priority 0's metrics is availability metrics, it will be scheduled first, only availability metrics collect success will the scheduling continue
    priority: 0
    # collect metrics content
    fields:
      # field-metric name, type-metric type(0-number,1-string), unit-metric unit('%','ms','MB'), label-if is metrics label
      - field: VmName
        type: 1
      - field: VmVendor
        type: 1
      - field: VmVersion
        type: 1
      - field: Uptime
        type: 0
        unit: ms
    # the protocol used for monitoring, eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: jmx
    # the config content when protocol is jmx
    jmx:
      # host: ipv4 ipv6 domain
      host: ^_^host^_^
      # port
      port: ^_^port^_^
      username: ^_^username^_^
      password: ^_^password^_^
      # jmx mbean object name
      objectName: java.lang:type=Runtime
      url: ^_^url^_^

  - name: memory_pool
    priority: 1
    fields:
      - field: name
        type: 1
        label: true
      - field: committed
        type: 0
        unit: MB
      - field: init
        type: 0
        unit: MB
      - field: max
        type: 0
        unit: MB
      - field: used
        type: 0
        unit: MB
    units:
      - committed=B->MB
      - init=B->MB
      - max=B->MB
      - used=B->MB
    # (optional)metrics field alias name, it is used as an alias field to map and convert the collected data and metrics field
    aliasFields:
      - Name
      - Usage->committed
      - Usage->init
      - Usage->max
      - Usage->used
    # mapping and conversion expressions, use these and aliasField above to calculate metrics value
    # eg: cores=core1+core2, usage=usage, waitTime=allTime-runningTime
    calculates:
      - name=Name
      - committed=Usage->committed
      - init=Usage->init
      - max=Usage->max
      - used=Usage->used
    protocol: jmx
    jmx:
      # host: ipv4 ipv6 domain
      host: ^_^host^_^
      # port
      port: ^_^port^_^
      username: ^_^username^_^
      password: ^_^password^_^
      objectName: java.lang:type=MemoryPool,name=*
      url: ^_^url^_^
```
