---
id: plugin  
title: 自定义插件      
sidebar_label: 自定义插件
---

## 自定义插件

### 简介

当前`Hertzbeat`在使用时，主要依赖`alert`模块对用户进行通知，然后用户采取一些措施如发送请求、执行`sql`、执行`shell`脚本等。
但目前只能通过手动或者`webhook`接收告警信息进行自动化处理。基于此，`HertzBeat`新增了`plugin`模块，该模块有一个通用接口`Plugin`，用户可以自己实现这个接口的`alert`方法，接收`Alert`类作为参数进行自定义操作。
用户添加自定义代码后，只需要对`plugin`模块进行打包。在`插件管理`中上传插件，即可实现告警后执行自定义功能。
目前，`HertzBeat`只在告警后设置了触发`alert`方法，如需在采集、启动程序等时机设置触发方法，请在`https://github.com/apache/hertzbeat/issues/new/choose` 提`Task`。

### 具体使用

1. 拉取主分支代码 `git clone https://github.com/apache/hertzbeat.git` ，定位到`plugin`模块的
   `Plugin`接口。
   ![plugin-1.png](/img/docs/help/plugin-1.png)
2. 在`org.apache.hertzbeat.plugin.impl`目录下, 新建一个接口实现类，如`org.apache.hertzbeat.plugin.impl.DemoPluginImpl`,在实现类中接收`Alert`类作为参数，实现`alert`方法，逻辑由用户自定义，这里我们简单打印一下对象。
