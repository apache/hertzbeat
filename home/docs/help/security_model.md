---
id: security_model
title: Security Model
sidebar_label: Security Model
---

:::tip
Apache HertzBeat™ is a highly extensible system that provides users with a lot of custom capabilities. Users can enhance the platform by customizing monitoring templates, custom monitoring, custom plugins, etc. In this case, security is very important.
This document will introduce the security model of Apache HertzBeat.
The security model here mainly involves the security boundaries that users need to pay attention to in the extension process, and how to ensure that user customization will not cause security risks to the system.
:::

> The permissions below depend on the configured roles and the endpoint being accessed.

## User Permission Security

Apache HertzBeat™ uses [Sureness](https://github.com/dromara/sureness) to support system user security.

Use the `sureness.yml` provided by Sureness to configure user accounts, roles, API resources, etc. It is strongly recommended that the initial user modify the account password. For details, refer to [Account Permission Management](../start/account-modify)

The bundled account source initially contains only `admin`; change its default password. The current 2.0 development version does not enforce an admin-only management boundary. Configured `user`, `guest`, and custom roles may access routes permitted by the active `sureness.yml` `resourceRole` rules and endpoint-specific checks; some `user` rules permit writes. Review the deployed configuration and grant access only to trusted identities. Do not assume these roles provide complete resource or credential isolation.

Machine-ingestion routes retain their own policies. For example, the shipped OTLP and Alertmanager rules allow `user`; this is separate from granting an account full administrative privileges.

## Monitoring Template Security

Apache HertzBeat™ provides a monitoring template feature that allows users to define monitoring rules by configuring custom monitoring templates and custom scripts.

A monitoring template may include scripts and other content such as SQL, SHELL, JMX, URL, and API. When creating custom monitoring templates, users are responsible for ensuring the security of the template content and avoiding malicious code or other unsafe elements.

## Custom Plugin Security

Apache HertzBeat™ supports users to upload custom code plugins to run in the life cycle of multiple systems, and users need to ensure the security of the custom plugin code themselves.

## Custom Collector Security

Apache HertzBeat™ supports users to customize collectors to personalize the collection of monitoring indicators, and users need to ensure the security of the custom collectors themselves.

## Custom URL and Other Parameter Security

Apache HertzBeat™ provides the ability to configure custom parameters. All users authorized to configure URLs and other parameters are considered highly trusted and are expected to trigger certain behaviors.

## Security Constraints in Other Customizations

Apache HertzBeat™ provides a variety of system extension methods and custom capabilities. Users need to pay attention to the security of customizations during use. Of course, all extension capabilities need to be within the scope of authenticated users.

----

## Reporting a Vulnerability

Please do not file GitHub issues for security vulnerabilities as they are public!

To report a new vulnerability you have discovered please follow the [ASF vulnerability reporting process](https://apache.org/security/#reporting-a-vulnerability).
