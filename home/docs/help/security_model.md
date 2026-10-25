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

> Management customization below is reserved for approved administrators.

## User Permission Security

For security reasons and given the current permission model, 1.9.1 removes the user and guest roles and keeps only admin. Old user and guest accounts cannot sign in even if they remain in sureness.yml. Administrators must manually edit the deployed sureness.yml, assign `role: [admin]` only to trusted accounts, restart and sign in again. Multiple independent usernames may hold admin. This role has all platform management permissions and must be assigned carefully; accounts are never automatically promoted or deleted.

Starting with 1.9.1, the only management role is `admin`. This is an intentional permission compatibility change. Existing user/guest/custom accounts are not automatically promoted. The deployment operator must manually approve trusted administrators; identities that are not granted admin cannot continue using the management plane. See [the required upgrade migration](./admin_only_migration) and [account configuration](../start/account-modify).

Administrators are trusted to manage the whole instance. Resource and credential isolation between administrators is not promised. Authentication, rejection of unauthorized access, existing secret masking and other explicit security restrictions remain required. This statement does not excuse secret disclosure or invalidate previously reported vulnerabilities. Public and machine-ingestion exceptions retain only their documented existing policies.

The `creator` field records the resource creator; it is not an ownership authorization, tenant-isolation or per-monitor credential-isolation boundary.

### Monitor Configuration Import and Export (Planned for 1.9.1)

The following restriction is intended for the upcoming 1.9.1 release. It does not describe the behavior of earlier releases or unpatched deployments.

Only authenticated users with the `admin` role may export monitor configurations through `GET /api/monitors/export` or `GET /api/monitors/export/all`, for every supported export format. The `user` and `guest` roles are denied. A user's permission to configure ordinary monitoring parameters does not grant permission to export these sensitive configurations.

Only authenticated users with the `admin` role may also import monitor configurations through `POST /api/monitors/import`. The `user` and `guest` roles are denied for every file format, including JSON, Excel and YAML, and for every entry in a batch. Admin import remains available with the existing format support; this permission check does not add new format support. Read-only monitoring template definitions are separate from importing monitor instances. Template management also requires admin; the documented public application hierarchy endpoint retains its existing policy.

The backend checks the role before dispatching an import to its parser or generating an export, even if an external `sureness.yml` retains older, broader monitor rules. The UI hides both import and export entries for non-admin roles. When upgrading, also merge the three admin-only import/export rules from the shipped `sureness.yml` into any customized configuration. Mounted or separately maintained configuration files are not automatically replaced. Do not add these endpoints to authentication exclusions; an excluded request has no authenticated subject and is refused by the controller.

Admin exports retain the existing import/export format and can contain sensitive credentials, including encrypted credential values. Treat exported files as secrets and share them only with authorized administrators. These transfer-specific checks do not redesign credential encryption or reuse or establish per-resource credential isolation.

## Notification Credentials and Destination Changes

Notification configuration is a shared admin management capability. Hiding a stored credential is not an ownership or isolation boundary between administrators. Grant admin only to trusted operators.

For Webhook authentication tokens, Telegram bot tokens, Discord bot tokens, and ntfy tokens, an unchanged configuration can reuse the stored credential without revealing it. Changing any of the following fields clears the corresponding credential input and requires explicit re-entry before saving or sending a test:

- Webhook: URL or authentication mode (Basic/Bearer).
- Telegram: chat ID or message thread ID.
- Discord: channel ID.
- ntfy: server URL or topic.

Changing the notification type clears the previous channel's credential inputs rather than carrying them into the new channel. Both save and test requests enforce destination binding on the server, including direct API requests. Invalid requests do not save a changed configuration or send a test message. Renaming a receiver or editing unrelated fields keeps normal credential reuse available.

An optional credential remains optional if none was previously configured. Removing Webhook authentication without changing its URL is still supported. If a credential was previously configured, changing its destination requires explicit re-entry rather than an empty value or a stored-secret placeholder. A fresh entry may contain the same actual credential; this rule prevents implicit reuse and does not revoke or rotate any credential at the provider. Cancelling an edit leaves the saved configuration unchanged.

This binding policy covers only the channel/field pairs listed above. Other notification providers may have different credential and recipient semantics. It does not introduce new role restrictions, track DNS/IP changes, or change HTTP redirect handling.

### SMN binding coverage

SMN `smnAk` and `smnSk` retain existing masking and mask validation, but this destination-binding change does not bind them to `smnProjectId`, `smnRegion` or `smnTopicUrn`. Changing those SMN destination fields currently does not require the credential re-entry enforced for the channels above.

The SMN sender passes the project ID, AK and SK to the Huawei Cloud SDK, selects the service endpoint through `SmnRegion.valueOf`, and supplies the topic URN to the publish request. SDK endpoint selection is not equivalent to HertzBeat credential-destination binding and does not establish an absence of risk. Continue reviewing authorized operators and cloud credential permissions. This note records an uncovered boundary; it adds no SMN binding mechanism and does not replace other security fixes.

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
