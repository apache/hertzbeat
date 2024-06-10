---
id: extend-point  
title: Custom Monitoring  
sidebar_label: Custom Monitoring    
---
> HertzBeat has custom monitoring ability. You only need to configure monitoring template yml to fit a custom monitoring type.  
> Custom monitoring currently supports [HTTP protocol](extend-http)，[JDBC protocol](extend-jdbc), [SSH protocol](extend-ssh), [JMX protocol](extend-jmx), [SNMP protocol](extend-snmp). And it will support more general protocols in the future.        

### Custom Monitoring Steps  

**HertzBeat Dashboard** -> **Monitoring Templates** -> **New Template** -> **Config Monitoring Template Yml** -> **Save and Apply** -> **Add A Monitoring with The New Monitoring Type** 


------- 

Configuration usages of the monitoring templates yml are detailed below.

### Monitoring Templates YML   

> We define all monitoring collection types (mysql,jvm,k8s) as yml monitoring templates, and users can import these templates to support corresponding types of monitoring.


> Monitoring template is used to define *the name of monitoring type(international), request parameter mapping, index information, collection protocol configuration information*, etc.  

eg：Define a custom monitoring type `app` named `example2` which use the HTTP protocol to collect data.    

**Monitoring Templates** -> **Config New Monitoring Template Yml** -> **Save and Apply**  


```yaml
# The monitoring type category：service-application service monitoring db-database monitoring custom-custom monitoring os-operating system monitoring
category: custom
# The monitoring type eg: linux windows tomcat mysql aws...
app: example2
# The monitoring i18n name
name:
  zh-CN: 模拟网站监测
  en-US: EXAMPLE WEBSITE
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
    defaultValue: 80
  # field-param field key
  - field: uri
    # name-param field display i18n name
    name:
      zh-CN: 相对路径
      en-US: URI
    # type-param field type(most mapping the html input tag)
    type: text
    # when type is text, use limit to limit string length
    limit: 200
    # required-true or false
    required: false
    # param field input placeholder
    placeholder: 'Website uri path(no ip port) EG:/console'
  # field-param field key
  - field: ssl
    # name-param field display i18n name
    name:
      zh-CN: 启用HTTPS
      en-US: HTTPS
    # type-param field type(most mapping the html input type)
    type: boolean
    # required-true or false
    required: true
  # field-param field key
  - field: timeout
    # name-param field display i18n name
    name:
      zh-CN: 超时时间(ms)
      en-US: Timeout(ms)
    # type-param field type(most mapping the html input tag)
    type: number
    # required-true or false
    required: false
    # hide param-true or false
    hide: true

metrics:
  # metrics - summary, inner monitoring metrics (responseTime - response time, keyword - number of keywords)
  - name: summary
    # metrics scheduling priority(0->127)->(high->low), metrics with the same priority will be scheduled in parallel
    # priority 0's metrics is availability metrics, it will be scheduled first, only availability metrics collect success will the scheduling continue
    priority: 0
    # collect metrics content
    fields:
      # field-metric name, type-metric type(0-number,1-string), unit-metric unit('%','ms','MB'), label-if is metrics label
      - field: responseTime
        type: 0
        unit: ms
      - field: keyword
        type: 0
    # the protocol used for monitoring, eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: http
    # the config content when protocol is http
    http:
      # http host: ipv4 ipv6 domain
      host: ^_^host^_^
      # http port
      port: ^_^port^_^
      # http url
      url: ^_^uri^_^
      timeout: ^_^timeout^_^
      # http method: GET POST PUT DELETE PATCH
      method: GET
      # if enabled https
      ssl: ^_^ssl^_^
      # http response data parse type: default-hertzbeat rule, jsonpath-jsonpath script, website-for website monitoring, prometheus-prometheus exporter rule
      parseType: website

```
