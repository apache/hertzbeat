---
id: extend-http-example-hertzbeat
title: 教程一:适配一款基于HTTP协议的监控类型   
sidebar_label: 教程一:适配一款HTTP协议监控
---

通过此教程我们一步一步描述如何在 Apache HertzBeat (incubating) 监控系统下新增适配一款基于http协议的监控类型。

阅读此教程前我们希望您已经从[自定义监控](extend-point)和[http协议自定义](extend-http)了解熟悉了怎么自定义类型，指标，协议等。

### HTTP协议解析通用响应结构体，获取指标数据

> 很多场景我们需要对提供的 HTTP API 接口进行监控，获取接口返回的指标值。这篇文章我们通过http自定义协议来解析我们常见的http接口响应结构，获取返回体中的字段作为指标数据。

```json
{
  "code": 200,
  "msg": "success",
  "data": {}
}

```

如上，通常我们的后台API接口会设计这这样一个通用返回。hertzbeat系统的后台也是如此，我们今天就用hertzbeat的 API 做样例，新增适配一款新的监控类型 **hertzbeat**，监控采集它的系统摘要统计API
`http://localhost:1157/api/summary`, 其响应数据为:

```json
{
  "msg": null,
  "code": 0,
  "data": {
    "apps": [
      {
        "category": "service",
        "app": "jvm",
        "status": 0,
        "size": 2,
        "availableSize": 0,
        "unManageSize": 2,
        "unAvailableSize": 0,
        "unReachableSize": 0
      },
      {
        "category": "service",
        "app": "website",
        "status": 0,
        "size": 2,
        "availableSize": 0,
        "unManageSize": 2,
        "unAvailableSize": 0,
        "unReachableSize": 0
      }
    ]
  }
}
```

**我们这次获取其app下的 `category`,`app`,`status`,`size`,`availableSize`等指标数据。**

### 新增自定义监控模板YML

**HertzBeat页面** -> **监控模板菜单** -> **新增监控类型** -> **配置自定义监控模板YML** -> **点击保存应用** -> **使用新监控类型添加监控**

> 监控模板YML用于定义 *监控类型的名称(国际化), 请求参数结构定义(前端页面根据配置自动渲染UI), 采集指标信息, 采集协议配置* 等。
> 即我们通过自定义这个监控模板，配置定义什么监控类型，前端页面需要输入什么参数，采集哪些性能指标，通过什么协议去采集。

样例：自定义一个名称为`hertzbeat`的自定义监控类型，其使用HTTP协议采集指标数据。

```yaml
category: custom
# The monitoring type eg: linux windows tomcat mysql aws...
app: hertzbeat
name:
  zh-CN: HertzBeat
  en-US: HertzBeat
# The description and help of this monitoring type
help:
  zh-CN: Hertzbeat 对 Hertzbeat 监控系统的通用指标进行测量监控。<br>您可以点击 “<i>新建 HertzBeat监控系统</i>” 并进行配置，或者选择“<i>更多操作</i>”，导入已有配置。
  en-US: Hertzbeat monitors HertzBeat Monitor through general performance metric. You could click the "<i>New HertzBeat Monitor</i>" button and proceed with the configuration or import an existing setup through the "<i>More Actions</i>" menu.
  zh-TW: Hertzbeat對Hertzbeat監控系統的通用名額進行量測監控。<br>您可以點擊“<i>新建HertzBeat監控系統</i>”並進行配寘，或者選擇“<i>更多操作</i>”，導入已有配寘。
helpLink:
  zh-CN: https://hertzbeat.apache.org/zh-cn/docs/help/hertzbeat
  en-US: https://hertzbeat.apache.org/docs/help/hertzbeat
params:
  - field: host
    name:
      zh-CN: 目标Host
      en-US: Target Host
    type: host
    required: true
  - field: port
    name:
      zh-CN: 端口
      en-US: Port
    type: number
    range: '[0,65535]'
    required: true
    defaultValue: 1157
  - field: ssl
    name:
      zh-CN: 启用HTTPS
      en-US: HTTPS
    type: boolean
    required: true
  - field: timeout
    name:
      zh-CN: 超时时间(ms)
      en-US: Timeout(ms)
    type: number
    required: false
    hide: true
  - field: authType
    name:
      zh-CN: 认证方式
      en-US: Auth Type
    type: radio
    required: false
    hide: true
    options:
      - label: Basic Auth
        value: Basic Auth
      - label: Digest Auth
        value: Digest Auth
  - field: username
    name:
      zh-CN: 用户名
      en-US: Username
    type: text
    limit: 50
    required: false
    hide: true
  - field: password
    name:
      zh-CN: 密码
      en-US: Password
    type: password
    required: false
    hide: true
metrics:
  # the first metrics summary
  # attention: Built-in monitoring metrics contains (responseTime - Response time)
  - name: summary
    # metrics scheduling priority(0->127)->(high->low), metrics with the same priority will be scheduled in parallel
    # priority 0's metrics is availability metrics, it will be scheduled first, only availability metrics collect success will the scheduling continue
    priority: 0
    # collect metrics content
    fields:
      # metrics content contains field-metric name, type-metric type:0-number,1-string, instance-if is metrics, unit-metric unit('%','ms','MB')
      - field: app
        type: 1
        label: true
      - field: category
        type: 1
      - field: status
        type: 0
      - field: size
        type: 0
      - field: availableSize
        type: 0
    #  the protocol used for monitoring, eg: sql, ssh, http, telnet, wmi, snmp, sdk, we use HTTP protocol here
    protocol: http
    # the config content when protocol is http
    http:
      # host: ipv4 ipv6 domain
      host: ^_^host^_^
      # http port
      port: ^_^port^_^
      # http url, we don't need to enter a parameter here, just set the fixed value to /api/summary
      url: /api/summary
      timeout: ^_^timeout^_^
      # http method: GET POST PUT DELETE PATCH, default fixed value is GET
      method: GET
      # if enabled https, default value is false
      ssl: ^_^ssl^_^
      # http auth
      authorization:
        # http auth type: Basic Auth, Digest Auth, Bearer Token
        type: ^_^authType^_^
        basicAuthUsername: ^_^username^_^
        basicAuthPassword: ^_^password^_^
        digestAuthUsername: ^_^username^_^
        digestAuthPassword: ^_^password^_^
      # http response data parse type: default-hertzbeat rule, jsonpath-jsonpath script, website-for website monitoring, we use jsonpath to parse response data here
      parseType: jsonPath
      parseScript: '$.data.apps.*'

```

**新增完毕，现在我们重启hertzbeat系统。我们可以看到系统页面已经多了一个`hertzbeat`监控类型了。**

![HertzBeat](/img/docs/advanced/extend-http-example-1.png)

### 系统页面添加对`hertzbeat`监控类型的监控

> 我们点击新增 `HertzBeat监控系统`，配置监控IP，端口，采集周期，高级设置里的账户密码等, 点击确定添加监控。

![HertzBeat](/img/docs/advanced/extend-http-example-2.png)

![HertzBeat](/img/docs/advanced/extend-http-example-3.png)

> 过一定时间(取决于采集周期)我们就可以在监控详情看到具体的指标数据和历史图表啦！

![HertzBeat](/img/docs/advanced/extend-http-example-4.png)

### 设置阈值告警通知

> 接下来我们就可以正常的设置阈值，告警触发后可以在告警中心查看，也可以新增接收人，设置告警通知等，Have Fun!!!

----  

#### 完

HTTP协议的自定义监控的实践就到这里，HTTP协议还带其他参数headers,params等，我们可以像用postman一样去定义它，可玩性也非常高！

如果您觉得hertzbeat这个开源项目不错的话欢迎给我们在GitHub Gitee star哦，灰常感谢。感谢老铁们的支持。笔芯！

**github: <https://github.com/apache/hertzbeat>**
