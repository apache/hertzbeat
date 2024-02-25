---
id: extend-tutorial
title: Quick Tutorial Customize and adapt a monitoring based on HTTP protocol
sidebar_label: Quick Tutorial
---

Through this tutorial, we describe step by step how to customize and adapt a monitoring type based on the http protocol under the hertzbeat monitoring tool.

Before reading this tutorial, we hope that you are familiar with how to customize types, metrics, protocols, etc. from [Custom Monitoring] (extend-point) and [http Protocol Customization] (extend-http).


### HTTP protocol parses the general response structure to obtain metric data

> In many scenarios, we need to monitor the provided HTTP API interface and obtain the index value returned by the interface. In this article, we use the http custom protocol to parse our common http interface response structure, and obtain the fields in the returned body as metric data.


```
{
   "code": 200,
   "msg": "success",
   "data": {}
}

```
As above, usually our background API interface will design such a general return. The same is true for the background of the hertzbeat system. Today, we will use the hertzbeat API as an example, add a new monitoring type **hertzbeat**, and monitor and collect its system summary statistics API
`http://localhost:1157/api/summary`, the response data is:

```
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

**This time we get the metric data such as `category`, `app`, `status`, `size`, `availableSize` under the app. **


### Add corresponding application definition YML and parameter definition YML

1. Custom monitoring type needs to add configuration YML file

A monitoring configuration definition file named after the monitoring type - for example: app-hertzbeat.yml needs to be located in the installation directory /hertzbeat/define/

Define which parameters we need to enter on the page. The general HTTP protocol parameters mainly include ip, port, headers, params, uri, account password, etc. We directly reuse the parameter definition content in param-api.yml and delete our No need to enter parameters such as uri parameters and keyword keywords.

Define what type of collection is, which protocol collection method needs to be used, what metrics are collected, protocol configuration parameters, etc. We directly reuse the definition content in app-api.yml and modify it to our current monitoring type `hertzbeat` configuration parameters, as follows: Note⚠️We get `category`, `app` in the interface response data this time, Fields such as `status`, `size`, `availableSize` are used as metric data.

```yaml
# This monitoring type belongs to the category: service-application service monitoring db-database monitoring custom-custom monitoring os-operating system monitoring
category: custom
# Monitoring application type name (consistent with the file name) eg: linux windows tomcat mysql aws...
app: hertzbeat
name:
   en-GB: HertzBeat Monitoring Tool
   en-US: Hertz Beat Monitor
params:
   - field: host
     name:
       en-CN: Host Host
       en-US: Host
     type: host
     required: true
   - field: port
     name:
       en-CN: port
       en-US: Port
     type: number
     range: '[0,65535]'
     required: true
     defaultValue: 1157
   - field: ssl
     name:
       en-GB: Enable HTTPS
       en-US: HTTPS
     type: boolean
     required: true
   - field: timeout
     name:
       en-CN: Timeout (ms)
       en-US: Timeout(ms)
     type: number
     required: false
     hide: true
   - field: authType
     name:
       en-CN: Authentication method
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
       en-CN: username
       en-US: Username
     type: text
     limit: 20
     required: false
     hide: true
   - field: password
     name:
       en-CN: Password
       en-US: Password
     type: password
     required: false
     hide: true
# List of metricss
metrics:
   # The first monitoring metrics summary
   # Note: Built-in monitoring metrics have (responseTime - response time)
   - name: summary
     # The smaller the index group scheduling priority (0-127), the higher the priority, and the index group with low priority will not be scheduled until the collection of index groups with high priority is completed, and the index groups with the same priority will be scheduled and collected in parallel
     # The metrics with priority 0 is the availability metrics, that is, it will be scheduled first, and other metricss will continue to be scheduled if the collection is successful, and the scheduling will be interrupted if the collection fails
     priority: 0
     # Specific monitoring metrics in the metrics
     fields:
       # metric information includes field name type field type: 0-number, 1-string , label-if is metrics label,  unit: metric unit
       - field: responseTime
         type: 0
         unit: ms
       - field: app
         type: 1
         instance: true
       - field: category
         type: 1
       - field: status
         type: 0
       - field: size
         type: 0
       - field: availableSize
         type: 0
# Monitoring and collection protocol eg: sql, ssh, http, telnet, wmi, snmp, sdk, we use HTTP protocol here
     protocol: http
# When the protocol is the http protocol, the specific collection configuration
     http:
       host: ^_^host^_^
       # port
       port: ^_^port^_^
       # url request interface path, we don’t need to enter parameters here, it’s written as /api/summary
       url: /api/summary
       timeout: ^_^timeout^_^
       # Request method GET POST PUT DELETE PATCH, hardcoded as
       method: GET
       # Whether to enable ssl/tls, that is, http or https, default false
       ssl: ^_^ssl^_^
       # authentication
       authorization:
         # Authentication methods: Basic Auth, Digest Auth, Bearer Token
         type: ^_^authType^_^
         basicAuthUsername: ^_^username^_^
         basicAuthPassword: ^_^password^_^
         digestAuthUsername: ^_^username^_^
         digestAuthPassword: ^_^password^_^
       # Response data parsing method: default-system rules, jsonPath-jsonPath script, website-website usability metric monitoring, we use jsonpath here to parse the response data
       parseType: jsonPath
       parseScript: '$.data.apps.*'

```

**The addition is complete, now we restart the hertzbeat system. We can see that the system page has added a `hertzbeat` monitoring type. **


![](/img/docs/advanced/extend-http-example-1.png)


### The system page adds the monitoring of `hertzbeat` monitoring type

> We click Add `HertzBeat Monitoring Tool`, configure monitoring IP, port, collection cycle, account password in advanced settings, etc., click OK to add monitoring.


![](/img/docs/advanced/extend-http-example-2.png)


![](/img/docs/advanced/extend-http-example-3.png)

> After a certain period of time (depending on the collection cycle), we can see the specific metric data and historical charts in the monitoring details!


![](/img/docs/advanced/extend-http-example-4.png)



### Set threshold alarm notification

> Next, we can set the threshold normally. After the alarm is triggered, we can view it in the alarm center, add a new recipient, set alarm notification, etc. Have Fun!!!


----

#### over!

This is the end of the practice of custom monitoring of the HTTP protocol. The HTTP protocol also has other parameters such as headers and params. We can define it like postman, and the playability is also very high!

If you think hertzbeat is a good open source project, please star us on GitHub Gitee, thank you very much. Thanks for the old iron support. Refill!

**github: https://github.com/dromara/hertzbeat**

**gitee: https://gitee.com/dromara/hertzbeat**
