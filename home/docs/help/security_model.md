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

> Unless a specific role restriction is stated, the users mentioned below refer to authenticated users of the system.

## User Permission Security

Apache HertzBeat™ uses [Sureness](https://github.com/dromara/sureness) to support system user security.

Use the `sureness.yml` provided by Sureness to configure user accounts, roles, API resources, etc. It is strongly recommended that the initial user modify the account password. For details, refer to [Account Permission Management](../start/account-modify)

HertzBeat 1.9.x retains its existing roles and shared, trusted-operator management model. An authenticated account with the `user` role is a trusted operator and may manage shared resources only within the permissions granted by the existing role rules. Authentication alone does not make every role an administrator or grant access to every operation. Explicit restrictions, including admin-only monitor configuration export below, remain in force.

The `creator` field records who created a resource; it is not an ownership-based authorization or isolation boundary. Managing a resource created by another operator is not, by itself, an authorization violation when the applicable role rules permit the operation. This model does not provide per-user ownership, tenant isolation, or per-monitor credential isolation. Users authorized to customize monitoring templates, URLs, scripts, or plugins must still be highly trusted. A future redesign of roles or isolation requires separate review; this clarification describes the existing shared-management design, rather than withdrawing a previously promised resource-isolation boundary, and does not change the 1.9.x permission rules.

These trust assumptions do not excuse authentication bypasses, bypasses of explicit role rules, disclosure of hidden credentials, or anonymous access to non-public data. Those remain security concerns requiring investigation and appropriate fixes; documenting the intended model does not by itself resolve or invalidate a reported issue.

### Monitor Configuration Export (Planned for 1.9.1)

The following restriction is intended for the upcoming 1.9.1 release. It does not describe the behavior of earlier releases or unpatched deployments.

Only authenticated users with the `admin` role may export monitor configurations through `GET /api/monitors/export` or `GET /api/monitors/export/all`, for every supported export format. The `user` and `guest` roles are denied. A user's permission to configure ordinary monitoring parameters does not grant permission to export these sensitive configurations.

The backend enforces this requirement before generating an export, even if an external `sureness.yml` retains an older, broader monitor-read rule. When upgrading, also merge the two admin-only export rules from the shipped `sureness.yml` into any customized configuration. Mounted or separately maintained configuration files are not automatically replaced. Do not add these endpoints to authentication exclusions.

Admin exports retain the existing import/export format and can contain sensitive credentials, including encrypted credential values. Treat exported files as secrets and share them only with authorized administrators. This restriction does not redesign credential encryption or reuse, change ordinary monitoring configuration permissions, or establish complete credential isolation between users.

## Notification Credentials and Destination Changes

Notification configuration remains a shared management capability. The existing `admin` and `user` permissions are unchanged; hiding a stored credential is not a per-user ownership or isolation boundary. Grant these roles only to trusted operators.

For Webhook authentication tokens, Telegram bot tokens, Discord bot tokens, and ntfy tokens, an unchanged configuration can reuse the stored credential without revealing it. Changing any of the following fields clears the corresponding credential input and requires explicit re-entry before saving or sending a test:

- Webhook: URL or authentication mode (Basic/Bearer).
- Telegram: chat ID or message thread ID.
- Discord: channel ID.
- ntfy: server URL or topic.

Changing the notification type clears the previous channel's credential inputs rather than carrying them into the new channel. Both save and test requests enforce destination binding on the server, including direct API requests. Invalid requests do not save a changed configuration or send a test message. Renaming a receiver or editing unrelated fields keeps normal credential reuse available.

An optional credential remains optional if none was previously configured. Removing Webhook authentication without changing its URL is still supported. If a credential was previously configured, changing its destination requires explicit re-entry rather than an empty value or a stored-secret placeholder. A fresh entry may contain the same actual credential; this rule prevents implicit reuse and does not revoke or rotate any credential at the provider. Cancelling an edit leaves the saved configuration unchanged.

This binding policy covers only the channel/field pairs listed above. Other notification providers may have different credential and recipient semantics. It does not introduce new role restrictions, track DNS/IP changes, or change HTTP redirect handling.

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
