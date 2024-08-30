---
id: plugin  
title: Custom plugin      
sidebar_label: Custom plugin
---

## Custom plugins

### Introduction

Currently, `Hertzbeat` relies on the `alert` module to notify the user, and then the user can take actions such as sending requests, executing `sql`, executing `shell` scripts, etc. However, this can only be automated manually or by `webhook` to receive the alert message.
However, at present, it is only possible to automate the process by receiving alert messages manually or through a `webhook`. For this reason, `HertzBeat` has added a new `plugin` module, which has a generic interface `Plugin`, which allows users to implement the `alert` method of this interface and receive the `Alert` class as a parameter to customize the operation.
After adding the customized code, you only need to package the `plugin` module, upload the plug-in in `Plugin Manage` to execute custom functions after the alarm.
Currently, `HertzBeat` only set up the trigger `alert` method after alarm, if you need to set up the trigger method at the time of acquisition, startup program, etc., please mention `Task` in `https://github.com/apache/hertzbeat/issues/new/choose`.

### Specific uses

1. Pull the master branch code `git clone https://github.com/apache/hertzbeat.git` and locate the `plugin` module's
   `Plugin` interface.
   ![plugin-1.png](/img/docs/help/plugin-1.png)
2. In the `org.apache.hertzbeat.plugin.impl` directory, create a new interface implementation class, such as `org.apache.hertzbeat.plugin.impl.DemoPluginImpl`, and receive the `Alert` class as a parameter, implement the `alert` method, the logic is customized by the user, here we simply print the object.
   ![plugin-2.png](/img/docs/help/plugin-2.png)
3. Add the fully qualified names of the interface implementation classes to the `META-INF/services/org.apache.hertzbeat.plugin.Plugin` file, with each implementation class name on a separate line.
4. Package the `hertzbeat-plugin` module.

