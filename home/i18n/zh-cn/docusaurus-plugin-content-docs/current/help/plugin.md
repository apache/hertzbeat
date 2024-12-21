---
id: plugin
title: 自定义插件(Beta)
sidebar_label: 自定义插件(Beta)
---

### 简介

当前`HertzBeat`在使用中，只有在告警后通过通知功能与外部系统产生交互，插件功能支持让用户在 `HertzBeat` 生命周期的各个阶段增加自定义操作。如在告警后执行`sql`、`shell`脚本等操作，在采集到监控数据后发送到其他的系统等。
用户按照自定义插件的流程开发插件并打包后，将打包后的文件通过 `插件管理` - `上传插件` 功能，上传并启用插件即可在不重启`HertzBeat`的情况下增加自定义功能。

:::warning
在当前版本中,自定义插件作为一个测试功能,可能会有一些限制和不稳定性,后续版本可能会重构插件功能。`
:::

### 支持的插件类型

1. `Post-Alert`插件
    - 作用：在告警后执行自定义操作
    - 实现接口：`org.apache.hertzbeat.plugin.PostAlertPlugin`
2. `Post-Collect`插件
    - 作用：在采集后执行自定义操作
    - 实现接口：`org.apache.hertzbeat.plugin.PostCollectPlugin`

:::tip
为了保证插件功能清晰，易于管理，我们建议且只支持一个插件中只包含一种插件类型接口的一个实现。
:::

如需在采集、启动程序等时机设置触发方法，请在`https://github.com/apache/hertzbeat/issues/new/choose` 提`Task`

### 开发步骤 （以实现一个告警后插件为例）

1. 拉取主分支代码 `git clone https://github.com/apache/hertzbeat.git` ，定位到`plugin`模块的
   `Plugin`接口。
   ![plugin-1.png](/img/docs/help/plugin-1.png)
2. 在`org.apache.hertzbeat.plugin.impl`目录下（如果没有请自行创建）, 新建一个 `org.apache.hertzbeat.plugin.PostAlertPlugin` 实现类，如`org.apache.hertzbeat.plugin.impl.DemoPlugin`,在实现类中接收`Alert`
   类作为参数，实现`execute`方法，逻辑由用户自定义，这里我们简单打印一下对象。

   ```java
     package org.apache.hertzbeat.plugin.impl;
     
     import org.apache.hertzbeat.common.entity.alerter.Alert;
     import org.apache.hertzbeat.common.entity.plugin.PluginContext;
     import org.apache.hertzbeat.plugin.PostAlertPlugin;
     import org.slf4j.Logger;
     import org.slf4j.LoggerFactory;
     
     
     public class DemoPlugin implements PostAlertPlugin {
     
         private static final Logger log = LoggerFactory.getLogger(DemoPlugin.class);
     
         @Override
         public void execute(Alert alert, PluginContext pluginContext) {
             log.info("DemoPlugin alert: {}", alert);
             log.info("DemoPlugin pluginContext: {}", pluginContext);
         }
     }
   ```

3. 在 `META-INF/services/org.apache.hertzbeat.plugin.PostAlertPlugin` （如果没有请自行创建） 文件中增加接口实现类的全限定名，每个实现类全限定名单独成行。

   ```shell
   org.apache.hertzbeat.plugin.impl.DemoPluginImpl
   ```

4. 打包 `hertzbeat-plugin` 模块。

   ```shell
   cd plugin
   mvn package
   ```

5. 通过 `插件管理`-`上传插件` 功能，上传以 `-jar-with-lib.jar` 结尾的插件包，启用插件即可在告警后执行自定义操作。

### 定义插件参数

插件功能支持自定义参数，并且在使用插件时可以通过`插件管理` - `编辑参数` 功能填写插件运行时需要的参数。
下面以定义一个包含两个参数的插件为例，详细介绍定义插件参数的流程：

1. 在 `define` 目录下增加参数定义文件 ，注意参数定义文件必须是名称为 define 开头的 yml 文件，例如 `define-demo.yml`;
2. 在 `define-demo.yml` 中定义参数，如下所示：

    ```yaml
   params:
     - field: host
       # name-param field display i18n name
       name:
         zh-CN: 目标 Host
         en-US: Target Host
       # type-param field type(most mapping the html input type)
       type: text
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
    ```

3. 在插件逻辑中使用参数

   ```java
    @Override
    public void execute(Alert alert, PluginContext pluginContext) {
        log.info("param host:{}",pluginContext.getString("host"));
        log.info("param port:{}",pluginContext.getInteger("port"));
    }
   ```
