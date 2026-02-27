---
id: security_model  
title: Security Model      
sidebar_label: Security Model
---

:::tip
Apache HertzBeat is a highly extensible system that provides users with a lot of custom capabilities. Users can enhance the platform by customizing monitoring templates, custom monitoring, custom plugins, etc. In this case, security is very important.
This document will introduce the security model of Apache HertzBeat.
The security model here mainly involves the security boundaries that users need to pay attention to in the extension process, and how to ensure that user customization will not cause security risks to the system.
:::

## User Permission Security

Apache HertzBeat uses [Sureness](https://github.com/dromara/sureness) to support system user security.

Use the `sureness.yml` provided by Sureness to configure user accounts, roles, API resources, etc. It is strongly recommended that the initial user modify the account password. For details, refer to [Account Permission Management](../start/account-modify)

## Monitoring Template Security

Apache HertzBeat provides monitoring template functions, and users can define monitoring rules by configuring custom scripts in the monitoring template.

The script types include `SQL` `SHELL` `JMX` `URL` `API`, etc. When users customize scripts, they need to ensure the security of the custom scripts themselves to avoid malicious code in the scripts.

## Custom Plugin Security

Apache HertzBeat supports users to upload custom code plugins to run in the life cycle of multiple systems, and users need to ensure the security of the custom plugin code themselves.

## Custom Collector Security

Apache HertzBeat supports users to customize collectors to personalize the collection of monitoring indicators, and users need to ensure the security of the custom collectors themselves.

## Security Constraints in Other Customizations

Apache HertzBeat provides a variety of system extension methods and custom capabilities. Users need to pay attention to the security of customizations during use. Of course, all extension capabilities need to be within the scope of authenticated users.

----

## Reporting a Vulnerability

Please do not file GitHub issues for security vulnerabilities as they are public!

To report a new vulnerability you have discovered please follow the [ASF vulnerability reporting process](https://apache.org/security/#reporting-a-vulnerability).
