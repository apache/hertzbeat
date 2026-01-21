---
id: plugin
title: Custom plugin(Beta)
sidebar_label: Custom plugin(Beta)
---

### Introduction

In the current usage of `HertzBeat`, interaction with external systems only occurs after an alert through the notification feature. The plugin functionality allows users to add custom operations at various stages of the `HertzBeat` lifecycle, such as executing `SQL` or `shell` scripts after an alert, or sending collected monitoring data to other systems. Users can develop plugins following the custom plugin development process, package them, and then upload and enable them using the `Plugin Management` - `Upload Plugin` feature, thereby adding custom functionality without restarting `HertzBeat`.

:::warning
In the current version, custom plugins are a test feature and may have some limitations and instability. The plugin functionality might be restructured in future versions.
:::

### Supported Plugin Types

1. `Post-Alert` Plugin
    - Purpose: Execute custom operations after an alert
    - Implementing Interface: `org.apache.hertzbeat.plugin.PostAlertPlugin`
2. `Post-Collect` Plugin
    - Purpose: Execute custom operations after data collection
    - Implementing Interface: `org.apache.hertzbeat.plugin.PostCollectPlugin`

:::tip
To ensure that plugin functionality is clear and easy to manage, we recommend and only support one implementation of one plugin type interface in a plugin.
:::

If you want to set trigger methods during collection, program startup, etc., please submit a `Task` at `https://github.com/apache/hertzbeat/issues/new/choose`.

### Development Steps (Example: Implementing a Post-Alert Plugin)

1. Clone the main branch code `git clone https://github.com/apache/hertzbeat.git`, and locate the `Plugin` interface in the `plugin` module.
   ![plugin-1.png](/img/docs/help/plugin-1.png)
2. In the `org.apache.hertzbeat.plugin.impl` directory (create it if it does not exist), create an implementation class of `org.apache.hertzbeat.plugin.PostAlertPlugin`, such as `org.apache.hertzbeat.plugin.impl.DemoPlugin`. In the implementation class, receive the `Alert` class as a parameter, implement the `execute` method, and define custom logic. Here, we simply print the object.

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

3. Add the fully qualified name of the implementation class to the `META-INF/services/org.apache.hertzbeat.plugin.PostAlertPlugin` file (create it if it does not exist). Each fully qualified name should be on a separate line.

   ```shell
   org.apache.hertzbeat.plugin.impl.DemoPluginImpl
   ```

4. Package the `hertzbeat-plugin` module.

   ```shell
   cd plugin
   mvn package
   ```

5. Use the `Plugin Management` - `Upload Plugin` feature to upload the plugin package ending with `-jar-with-lib.jar`, and enable the plugin to execute custom operations after an alert.

### Defining Plugin Parameters

The plugin feature supports custom parameters, and you can fill in the required parameters for the plugin during runtime using the `Plugin Management` - `Edit Parameters` feature.
Below is an example of defining a plugin with two parameters, detailing the process of defining plugin parameters:

1. Add a parameter definition file in the `define` directory. Note that the parameter definition file must be a YAML file starting with `define`, such as `define-demo.yml`.
2. Define parameters in `define-demo.yml` as shown below:

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

3. Use the parameters in the plugin logic

   ```java
    @Override
    public void execute(Alert alert, PluginContext pluginContext) {
        log.info("param host:{}",pluginContext.getString("host"));
        log.info("param port:{}",pluginContext.getInteger("port"));
    }
   ```
