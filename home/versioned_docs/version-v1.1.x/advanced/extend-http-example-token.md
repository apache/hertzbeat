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

1. 自定义监控类型需新增配置YML文件,我们直接复用教程一的 `hertzbeat` 监控类型，在其基础上修改

用监控类型命名的监控配置定义文件 - app-hertzbeat_token.yml 需位于安装目录 /hertzbeat/define/ 下

监控配置定义文件是用来定义采集类型是啥，需要用哪种协议采集方式，采集的指标是啥，协议的配置参数等。
我们直接复用 app-hertzbeat.yml 里面的定义内容,修改为我们当前的监控类型`hertzbeat_auth`配置参数, 比如 `app, category等`。

```yaml
# 监控类型所属类别：service-应用服务 program-应用程序 db-数据库 custom-自定义 os-操作系统 bigdata-大数据 mid-中间件 webserver-web服务器 cache-缓存 cn-云原生 network-网络监控等等
category: custom
# 监控应用类型(与文件名保持一致) eg: linux windows tomcat mysql aws...
app: hertzbeat_token
name:
  zh-CN: HertzBeat监控(Token)
  en-US: HertzBeat Monitor(Token) 
params:
  # field-字段名称标识符
  - field: host
    # name-参数字段显示名称
    name:
      zh-CN: 主机Host
      en-US: Host
    # type-字段类型,样式(大部分映射input标签type属性)
    type: host
    # 是否是必输项 true-必填 false-可选
    required: true
  - field: port
    name:
      zh-CN: 端口
      en-US: Port
    type: number
    # 当type为number时,用range表示范围
    range: '[0,65535]'
    required: true
    # 端口默认值
    defaultValue: 1157
    # 参数输入框提示信息
    placeholder: '请输入端口'
  - field: ssl
    name:
      zh-CN: 启动SSL
      en-US: SSL
    # 当type为boolean时,前端用switch展示开关
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
# 采集指标配置列表 todo 下方配置
metrics: ......

```

### 定义监控指标`auth`登录请求获取`token`  

1. 在`app-hertzbeat_token.yml`新增一个监控指标定义 `auth`, 设置采集优先级为最高0，采集指标 `token`.  

```yaml

# 监控类型所属类别：service-应用服务 program-应用程序 db-数据库 custom-自定义 os-操作系统 bigdata-大数据 mid-中间件 webserver-web服务器 cache-缓存 cn-云原生 network-网络监控等等
category: custom
# 监控应用类型(与文件名保持一致) eg: linux windows tomcat mysql aws...
app: hertzbeat_token
name:
  zh-CN: HertzBeat监控(Token)
  en-US: HertzBeat Monitor(Token) 
params:
  # field-字段名称标识符
  - field: host
    # name-参数字段显示名称
    name:
      zh-CN: 主机Host
      en-US: Host
    # type-字段类型,样式(大部分映射input标签type属性)
    type: host
    # 是否是必输项 true-必填 false-可选
    required: true
  - field: port
    name:
      zh-CN: 端口
      en-US: Port
    type: number
    # 当type为number时,用range表示范围
    range: '[0,65535]'
    required: true
    # 端口默认值
    defaultValue: 1157
    # 参数输入框提示信息
    placeholder: '请输入端口'
  - field: ssl
    name:
      zh-CN: 启动SSL
      en-US: SSL
    # 当type为boolean时,前端用switch展示开关
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
# 采集指标配置列表
metrics:
  # 第一个监控指标 auth
  # 注意：内置监控指标有 (responseTime - 响应时间)
  - name: auth
    # 指标调度优先级(0-127)越小优先级越高,优先级低的指标会等优先级高的指标采集完成后才会被调度,相同优先级的指标会并行调度采集
    # 优先级为0的指标为可用性指标,即它会被首先调度,采集成功才会继续调度其它指标,采集失败则中断调度
    priority: 0
    # 具体监控指标列表
    fields:
      # 指标信息 包括 field名称   type字段类型:0-number数字,1-string字符串   label是否为标签   unit:指标单位
      - field: token
        type: 1
      - field: refreshToken
        type: 1
    # 监控采集使用协议 eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: http
    # 当protocol为http协议时具体的采集配置
    http:
      # 主机host: ipv4 ipv6 域名
      host: ^_^host^_^
      # 端口
      port: ^_^port^_^
      # url请求接口路径
      url: /api/account/auth/form
      # 请求方式 GET POST PUT DELETE PATCH
      method: POST
      # 是否启用ssl/tls,即是http还是https,默认false
      ssl: ^_^ssl^_^
      payload: ^_^payload^_^
      # 请求头内容
      headers:
        content-type: ^_^contentType^_^
      # 响应数据解析方式: default-系统规则,jsonPath-jsonPath脚本,website-网站可用性指标监控
      parseType: jsonPath
      parseScript: '$.data'

```

**此时，重启hertzbeat系统，在系统页面上添加 `hertzbeat_token` 类型监控，配置输入参数，`content-type`填`application/json` , `请求Body`填账户密码json如下: **

```json
{
  "credential": "hertzbeat",
  "identifier": "admin"
}
```

![](/img/docs/advanced/extend-http-example-5.png)


**新增成功后我们就可以在详情页面看到我们采集的 `token`, `refreshToken`指标数据。**

![](/img/docs/advanced/extend-http-example-6.png)

![](/img/docs/advanced/extend-http-example-7.png)



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

# 监控类型所属类别：service-应用服务 program-应用程序 db-数据库 custom-自定义 os-操作系统 bigdata-大数据 mid-中间件 webserver-web服务器 cache-缓存 cn-云原生 network-网络监控等等
category: custom
# 监控应用类型(与文件名保持一致) eg: linux windows tomcat mysql aws...
app: hertzbeat_token
name:
  zh-CN: HertzBeat监控(Token)
  en-US: HertzBeat Monitor(Token)
params:
  # field-字段名称标识符
  - field: host
    # name-参数字段显示名称
    name:
      zh-CN: 主机Host
      en-US: Host
    # type-字段类型,样式(大部分映射input标签type属性)
    type: host
    # 是否是必输项 true-必填 false-可选
    required: true
  - field: port
    name:
      zh-CN: 端口
      en-US: Port
    type: number
    # 当type为number时,用range表示范围
    range: '[0,65535]'
    required: true
    # 端口默认值
    defaultValue: 1157
    # 参数输入框提示信息
    placeholder: '请输入端口'
  - field: ssl
    name:
      zh-CN: 启动SSL
      en-US: SSL
    # 当type为boolean时,前端用switch展示开关
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
# 采集指标配置列表
metrics:
# 第一个监控指标 cpu
# 注意：内置监控指标有 (responseTime - 响应时间)
  - name: auth
    # 指标调度优先级(0-127)越小优先级越高,优先级低的指标会等优先级高的指标采集完成后才会被调度,相同优先级的指标会并行调度采集
    # 优先级为0的指标为可用性指标,即它会被首先调度,采集成功才会继续调度其它指标,采集失败则中断调度
    priority: 0
    # 具体监控指标列表
    fields:
      # 指标信息 包括 field名称   type字段类型:0-number数字,1-string字符串   label是否为标签   unit:指标单位
      - field: token
        type: 1
      - field: refreshToken
        type: 1
    # 监控采集使用协议 eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: http
    # 当protocol为http协议时具体的采集配置
    http:
      # 主机host: ipv4 ipv6 域名
      host: ^_^host^_^
      # 端口
      port: ^_^port^_^
      # url请求接口路径
      url: /api/account/auth/form
      # 请求方式 GET POST PUT DELETE PATCH
      method: POST
      # 是否启用ssl/tls,即是http还是https,默认false
      ssl: ^_^ssl^_^
      payload: ^_^payload^_^
      # 请求头内容
      headers:
        content-type: ^_^contentType^_^
        ^_^headers^_^: ^_^headers^_^
      # 请求参数内容
      params:
        ^_^params^_^: ^_^params^_^
      # 响应数据解析方式: default-系统规则,jsonPath-jsonPath脚本,website-网站可用性指标监控
      parseType: jsonPath
      parseScript: '$.data'


  - name: summary
    # 指标调度优先级(0-127)越小优先级越高,优先级低的指标会等优先级高的指标采集完成后才会被调度,相同优先级的指标会并行调度采集
    # 优先级为0的指标为可用性指标,即它会被首先调度,采集成功才会继续调度其它指标,采集失败则中断调度
    priority: 1
    # 具体监控指标列表
    fields:
      # 指标信息 包括 field名称   type字段类型:0-number数字,1-string字符串   label是否为标签   unit:指标单位
      - field: category
        type: 1
      - field: app
        type: 1
      - field: size
        type: 0
      - field: status
        type: 0
# 监控采集使用协议 eg: sql, ssh, http, telnet, wmi, snmp, sdk
    protocol: http
# 当protocol为http协议时具体的采集配置
    http:
      # 主机host: ipv4 ipv6 域名
      host: ^_^host^_^
      # 端口
      port: ^_^port^_^
      # url请求接口路径
      url: /api/summary
      # 请求方式 GET POST PUT DELETE PATCH
      method: GET
      # 是否启用ssl/tls,即是http还是https,默认false
      ssl: ^_^ssl^_^
      # 认证
      authorization:
        # 认证方式: Basic Auth, Digest Auth, Bearer Token
        type: Bearer Token
        bearerTokenToken: ^o^token^o^
      # 响应数据解析方式: default-系统规则,jsonPath-jsonPath脚本,website-网站可用性指标监控
      parseType: jsonPath
      parseScript: '$.data.apps.*'

```

**配置完成后，再次重启 `hertzbeat` 系统，查看监控详情页面**   

![](/img/docs/advanced/extend-http-example-8.png)  

![](/img/docs/advanced/extend-http-example-9.png)

### 设置阈值告警通知

> 接下来我们就可以正常设置阈值，告警触发后可以在告警中心查看，也可以新增接收人，设置告警通知等，Have Fun!!!

----  

#### 完！

HTTP协议的自定义监控的实践就到这里，HTTP协议还带其他参数headers,params等，我们可以像用postman一样去定义它，可玩性也非常高！

如果您觉得hertzbeat这个开源项目不错的话欢迎给我们在GitHub Gitee star哦，灰常感谢。感谢老铁们的支持。笔芯！

**github: https://github.com/dromara/hertzbeat**

**gitee: https://gitee.com/dromara/hertzbeat**
