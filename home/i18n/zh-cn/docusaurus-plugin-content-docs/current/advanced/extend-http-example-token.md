---
id: extend-http-example-token
title: 教程二:基于HTTP协议获取TOKEN指标值，给后续采集认证使用   
sidebar_label: 教程二:获取TOKEN后续认证使用
---

通过此教程我们一步一步描述如何在教程一的基础上改造，新增一个监控指标，先调用认证接口获取TOKEN后，使用TOKEN作为参数供后面的监控指标采集认证使用。

阅读此教程前我们希望您已经从[自定义监控](extend-point)和[http协议自定义](extend-http)了解熟悉了怎么自定义类型，指标，协议等。

### 请求流程

【**认证信息监控指标(优先级最高)**】【**HTTP接口携带账户密码调用**】->【**响应数据解析**】->【**解析签发TOKEN-accessToken作为指标**】->【**将accessToken作为变量参数赋值给其他采集监控指标**】

> 这里我们依然用教程一的hertzbeat监控举例！hertzbeat后台接口不仅仅支持教程一使用的basic直接账户密码认证，也支持token认证。

**我们需要`POST`调用登录接口`/api/account/auth/form`获取`accessToken`,请求body(json格式)如下**:

```json
{
  "credential": "hertzbeat",
  "identifier": "admin"
}
```

**响应结构数据如下**:

```json
{
  "data": {
    "token": "xxxx",
    "refreshToken": "xxxx"
  },
  "msg": null,
  "code": 0
}
```

### 新增自定义监控类型`hertzbeat_token`

1. 自定义监控类型需新增配置监控模板YML,我们直接复用教程一的 `hertzbeat` 监控类型，在其基础上修改

监控配置定义文件是用来定义采集类型是啥，需要用哪种协议采集方式，采集的指标是啥，协议的配置参数等。
我们直接复用 app-hertzbeat.yml 里面的定义内容,修改为我们当前的监控类型`hertzbeat_auth`配置参数, 比如 `app, category等`。

```yaml
category: custom
# The monitoring type eg: linux windows tomcat mysql aws...
app: hertzbeat_token
# The monitoring i18n name
name:
  zh-CN: HertzBeat(Token)
  en-US: HertzBeat(Token)
# The description and help of this monitoring type
help:
  zh-CN: Hertzbeat 对 HertzBeat监控(Token)进行测量监控。<br>您可以点击 “<i>新建 HertzBeat监控(Token)</i>” 并进行配置，或者选择“<i>更多操作</i>”，导入已有配置。
  en-US: Hertzbeat monitors HertzBeat Monitor(Token). You could click the "<i>New HertzBeat Monitor(Token)</i>" button and proceed with the configuration or import an existing setup through the "<i>More Actions</i>" menu.
  zh-TW: Hertzbeat對HertzBeat監控（Token）進行量測監控。<br>您可以點擊“<i>新建HertzBeat監控（Token）</i>”並進行配寘，或者選擇“<i>更多操作</i>”，導入已有配寘。
helpLink:
  zh-CN: https://hertzbeat.apache.org/zh-cn/docs/help/hertzbeat_token
  en-US: https://hertzbeat.apache.org/docs/help/hertzbeat_token
# Input params define for monitoring(render web ui by the definition)
params:
  # field-param field key
  - field: host
    # name-param field display i18n name
    name:
      zh-CN: 目标Host
      en-US: Target Host
    # type-param field type(most mapping the html input type)
    type: host
    # required-true or false
    required: true
  - field: port
    name:
      zh-CN: 端口
      en-US: Port
    # type-param field type(most mapping the html input type)
    type: number
    # when type is number, range is required
    range: '[0,65535]'
    required: true
    defaultValue: 1157
    placeholder: 'Please input port'
  - field: ssl
    name:
      zh-CN: 启动SSL
      en-US: SSL
    # type-param field type(boolean mapping the html switch tag)
    type: boolean
    required: false
  - field: contentType
    name:
      zh-CN: Content-Type
      en-US: Content-Type
    type: text
    placeholder: 'Request Body Type'
    required: false
  - field: payload
    name:
      zh-CN: 请求BODY
      en-US: BODY
    type: textarea
    placeholder: 'Available When POST PUT'
    required: false
```

### 定义监控指标`auth`登录请求获取`token`

1. 在`app-hertzbeat_token.yml`新增一个监控指标定义 `auth`, 设置采集优先级为最高0，采集指标 `token`.

```yaml

category: custom
# The monitoring type eg: linux windows tomcat mysql aws...
app: hertzbeat_token
# The monitoring i18n name
name:
  zh-CN: HertzBeat(Token)
  en-US: HertzBeat(Token)
# The description and help of this monitoring type
help:
  zh-CN: Hertzbeat 对 HertzBeat监控(Token)进行测量监控。<br>您可以点击 “<i>新建 HertzBeat监控(Token)</i>” 并进行配置，或者选择“<i>更多操作</i>”，导入已有配置。
  en-US: Hertzbeat monitors HertzBeat Monitor(Token). You could click the "<i>New HertzBeat Monitor(Token)</i>" button and proceed with the configuration or import an existing setup through the "<i>More Actions</i>" menu.
  zh-TW: Hertzbeat對HertzBeat監控（Token）進行量測監控。<br>您可以點擊“<i>新建HertzBeat監控（Token）</i>”並進行配寘，或者選擇“<i>更多操作</i>”，導入已有配寘。
helpLink:
  zh-CN: https://hertzbeat.apache.org/zh-cn/docs/help/hertzbeat_token
  en-US: https://hertzbeat.apache.org/docs/help/hertzbeat_token
# Input params define for monitoring(render web ui by the definition)
params:
  # field-param field key
  - field: host
    # name-param field display i18n name
    name:
      zh-CN: 目标Host
      en-US: Target Host
    # type-param field type(most mapping the html input type)
    type: host
    # required-true or false
    required: true
  - field: port
    name:
      zh-CN: 端口
      en-US: Port
    # type-param field type(most mapping the html input type)
    type: number
    # when type is number, range is required
    range: '[0,65535]'
    required: true
    defaultValue: 1157
    placeholder: 'Please input port'
  - field: ssl
    name:
      zh-CN: 启动SSL
      en-US: SSL
    # type-param field type(boolean mapping the html switch tag)
    type: boolean
    required: false
  - field: contentType
    name:
      zh-CN: Content-Type
      en-US: Content-Type
    type: text
    placeholder: 'Request Body Type'
    required: false
  - field: payload
    name:
      zh-CN: 请求BODY
      en-US: BODY
    type: textarea
    placeholder: 'Available When POST PUT'
    required: false
# collect metrics config list
metrics:
  # metrics - auth
  - name: auth
    # metrics scheduling priority(0->127)->(high->low), metrics with the same priority will be scheduled in parallel
    # priority 0's metrics is availability metrics, it will be scheduled first, only availability metrics collect success will the scheduling continue
    priority: 0
    # collect metrics content
    fields:
      # field-metric name, type-metric type(0-number,1-string), unit-metric unit('%','ms','MB'), label-whether it is a metrics label field
      - field: token
        type: 1
      - field: refreshToken
        type: 1
    # the protocol used for monitoring, eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: http
    # the config content when protocol is http
    http:
      # http host: ipv4 ipv6 domain
      host: ^_^host^_^
      # http port
      port: ^_^port^_^
      # http url
      url: /api/account/auth/form
      # http method: GET POST PUT DELETE PATCH
      method: POST
      # if enabled https
      ssl: ^_^ssl^_^
      payload: ^_^payload^_^
      # http request header content
      headers:
        content-type: ^_^contentType^_^
        ^_^headers^_^: ^_^headers^_^
      # http request params
      params:
        ^_^params^_^: ^_^params^_^
      # http response data parse type: default-hertzbeat rule, jsonpath-jsonpath script, website-for website monitoring, prometheus-prometheus exporter rule
      parseType: jsonPath
      parseScript: '$.data'

```

**此时，重启hertzbeat系统，在系统页面上添加 `hertzbeat_token` 类型监控，配置输入参数，`content-type`填`application/json` , `请求Body`填账户密码json如下:**

```json
{
  "credential": "hertzbeat",
  "identifier": "admin"
}
```

![HertzBeat](/img/docs/advanced/extend-http-example-5.png)

**新增成功后我们就可以在详情页面看到我们采集的 `token`, `refreshToken`指标数据。**

![HertzBeat](/img/docs/advanced/extend-http-example-6.png)

![HertzBeat](/img/docs/advanced/extend-http-example-7.png)

### 将`token`作为变量参数给后面的监控指标采集使用

**在`app-hertzbeat_token.yml`新增一个监控指标定义 `summary` 同教程一中的`summary`相同, 设置采集优先级为1**
**设置此监控指标的HTTP协议配置中认证方式为 `Bearer Token` 将上一个监控指标`auth`采集的指标`token`作为参数给其赋值，使用`^o^`作为内部替换符标识，即`^o^token^o^`。如下:**

```yaml
  - name: summary
# 当protocol为http协议时具体的采集配置
    http:
      # 认证
      authorization:
        # 认证方式: Basic Auth, Digest Auth, Bearer Token
        type: Bearer Token
        bearerTokenToken: ^o^token^o^
```

**最终`app-hertzbeat_token.yml`定义如下:**

```yaml

category: custom
# The monitoring type eg: linux windows tomcat mysql aws...
app: hertzbeat_token
# The monitoring i18n name
name:
  zh-CN: HertzBeat(Token)
  en-US: HertzBeat(Token)
# The description and help of this monitoring type
help:
  zh-CN: Hertzbeat 对 HertzBeat监控(Token)进行测量监控。<br>您可以点击 “<i>新建 HertzBeat监控(Token)</i>” 并进行配置，或者选择“<i>更多操作</i>”，导入已有配置。
  en-US: Hertzbeat monitors HertzBeat Monitor(Token). You could click the "<i>New HertzBeat Monitor(Token)</i>" button and proceed with the configuration or import an existing setup through the "<i>More Actions</i>" menu.
  zh-TW: Hertzbeat對HertzBeat監控（Token）進行量測監控。<br>您可以點擊“<i>新建HertzBeat監控（Token）</i>”並進行配寘，或者選擇“<i>更多操作</i>”，導入已有配寘。
helpLink:
  zh-CN: https://hertzbeat.apache.org/zh-cn/docs/help/hertzbeat_token
  en-US: https://hertzbeat.apache.org/docs/help/hertzbeat_token
# Input params define for monitoring(render web ui by the definition)
params:
  # field-param field key
  - field: host
    # name-param field display i18n name
    name:
      zh-CN: 目标Host
      en-US: Target Host
    # type-param field type(most mapping the html input type)
    type: host
    # required-true or false
    required: true
  - field: port
    name:
      zh-CN: 端口
      en-US: Port
    # type-param field type(most mapping the html input type)
    type: number
    # when type is number, range is required
    range: '[0,65535]'
    required: true
    defaultValue: 1157
    placeholder: 'Please input port'
  - field: ssl
    name:
      zh-CN: 启动SSL
      en-US: SSL
    # type-param field type(boolean mapping the html switch tag)
    type: boolean
    required: false
  - field: contentType
    name:
      zh-CN: Content-Type
      en-US: Content-Type
    type: text
    placeholder: 'Request Body Type'
    required: false
  - field: payload
    name:
      zh-CN: 请求BODY
      en-US: BODY
    type: textarea
    placeholder: 'Available When POST PUT'
    required: false
# collect metrics config list
metrics:
  # metrics - auth
  - name: auth
    # metrics scheduling priority(0->127)->(high->low), metrics with the same priority will be scheduled in parallel
    # priority 0's metrics is availability metrics, it will be scheduled first, only availability metrics collect success will the scheduling continue
    priority: 0
    # collect metrics content
    fields:
      # field-metric name, type-metric type(0-number,1-string), unit-metric unit('%','ms','MB'), label-whether it is a metrics label field
      - field: token
        type: 1
      - field: refreshToken
        type: 1
    # the protocol used for monitoring, eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: http
    # the config content when protocol is http
    http:
      # http host: ipv4 ipv6 domain
      host: ^_^host^_^
      # http port
      port: ^_^port^_^
      # http url
      url: /api/account/auth/form
      # http method: GET POST PUT DELETE PATCH
      method: POST
      # if enabled https
      ssl: ^_^ssl^_^
      payload: ^_^payload^_^
      # http request header content
      headers:
        content-type: ^_^contentType^_^
        ^_^headers^_^: ^_^headers^_^
      # http request params
      params:
        ^_^params^_^: ^_^params^_^
      # http response data parse type: default-hertzbeat rule, jsonpath-jsonpath script, website-for website monitoring, prometheus-prometheus exporter rule
      parseType: jsonPath
      parseScript: '$.data'


  - name: summary
    priority: 1
    fields:
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
    protocol: http
    http:
      host: ^_^host^_^
      port: ^_^port^_^
      url: /api/summary
      method: GET
      ssl: ^_^ssl^_^
      authorization:
        type: Bearer Token
        # ^o^xxx^o^ ^o^ substitution represents the value of the acquisition metric xxx of the previous priority
        bearerTokenToken: ^o^token^o^
      parseType: jsonPath
      parseScript: '$.data.apps.*'

```

**配置完成后，再次重启 `hertzbeat` 系统，查看监控详情页面**

![HertzBeat](/img/docs/advanced/extend-http-example-8.png)

![HertzBeat](/img/docs/advanced/extend-http-example-9.png)

### 设置阈值告警通知

> 接下来我们就可以正常设置阈值，告警触发后可以在告警中心查看，也可以新增接收人，设置告警通知等，Have Fun!!!

----  

#### 完

HTTP协议的自定义监控的实践就到这里，HTTP协议还带其他参数headers,params等，我们可以像用postman一样去定义它，可玩性也非常高！

如果您觉得hertzbeat这个开源项目不错的话欢迎给我们在GitHub Gitee star哦，灰常感谢。感谢老铁们的支持。笔芯！

**github: <https://github.com/apache/hertzbeat>**
