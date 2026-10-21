---
id: admin_only_migration
title: Administrator-only management migration in 1.9.1
sidebar_label: 1.9.1 Admin Migration
---

From 1.9.1, only admin can manage HertzBeat. Existing user and guest accounts cannot sign in even with old configuration. Ask your administrator to manually edit sureness.yml, change only trusted users to admin, restart and sign in again. Admin has all platform management permissions: assign it carefully. No account is automatically promoted or deleted.

## Intentional compatibility change

HertzBeat 1.9.1 intentionally removes `user`, `guest` and custom non-admin roles from the management plane. The only supported management role is the exact role `admin`. This is a permission compatibility change, including operations that were previously read-only. Old accounts are not deleted or automatically promoted, and stored application data is not migrated to a new owner.

An administrator is a trusted operator of the entire instance. Only grant this role after explicitly reviewing the person's or automation's trust and operational needs. The platform does not promise resource or credential isolation between administrators. This trust model does not excuse unauthorized access, secret disclosure, authentication bypasses or other security bugs, and does not declare previously reported vulnerabilities invalid. Existing secret masking remains in place; this migration adds no plaintext secret display.

## Before upgrading

1. Inventory existing accounts in the deployed account source, including `user`, `guest`, custom roles and automation credentials. Inventory browser sessions, legacy JWTs, refresh tokens and managed API tokens, with their owners and uses.
2. Review which people and automations are trusted to administer the whole instance. **Manually** assign `admin` only to those approved identities. A role containing `admin` is accepted; aliases such as `administrator` are not. Do not copy a blanket role-conversion command or grant every existing account `admin`.
3. Anyone who should not receive `admin` must stop using the management API and UI after upgrade. There is no replacement management read-only role in this release. Do not retain broad external rules or add management endpoints to authentication exclusions to work around this boundary.
4. Merge the shipped `sureness.yml` management rules into mounted/custom configuration while preserving reviewed account credentials and the documented machine rules below. Do not overwrite a deployment's account file with a sample. The upgrade does not edit deployed account records or add privileges.
5. First validate the upgrade in a test environment: successful admin login/read/write; rejected old user/guest/custom login, refresh and management requests; rejected old non-admin JWT/API token; a removed, disabled or demoted admin account; and each integration below. Restart after changing the document account source so cached account information is reloaded.
6. Approved administrators should sign in again and replace/revoke management automation tokens as appropriate. Newly issued management access/API tokens contain only `admin`. Existing non-admin access/API tokens never acquire `admin` automatically, even if their account was later approved. Refresh succeeds only for a currently approved administrator account; do not treat it as an automatic account migration.

Do not replace an ingestion credential with an admin token merely to make an integration work: an admin token grants the management capability of its approved owner. Review that privilege explicitly, or retain the integration's existing permitted machine authentication while planning its lifecycle.

## Enforced management boundary

The servlet authentication filter requires both an authenticated subject with the exact `admin` role and a current, enabled account that still holds `admin`.
This applies to all management paths under `/api`, including reads, future/unruled operations, monitor creation/edit/clone/detect/import/export, notification tests, configuration, templates, plugins, chat/SOP and MCP; it also covers administrative Actuator, OpenAPI and H2-console paths. It runs independently of externally supplied route role/exclusion rules. A missing subject receives 401; a non-admin or invalid current administrator account receives 403. Authentication and existing managed-token revocation checks remain enabled.

Login and refresh validate credentials and current account state and refuse non-admin management sessions. Generating a management API token requires an admin subject and current admin account. The frontend gates the whole management route tree/menu and rejects non-admin login responses; frontend role storage is not the security boundary.

An old external rule that permits user/guest or excludes a management path cannot reopen that path. An incorrect exclusion also leaves an administrator without an authenticated subject and blocks access; fix the configuration rather than disabling authentication. Existing explicit restrictions such as the ban on reading system signing/encryption secrets remain restrictions on administrators too.

## Public and machine exceptions

These exceptions preserve the existing authentication and authorization policies. They do **not** make every exception anonymous, grant new roles, or provide alternate management access. Only the listed methods and routes are exempt from the new admin management gate; their existing Sureness rules and protocol validation still apply.

| Purpose | Method and route | Existing policy retained |
|---|---|---|
| Login / refresh | POST `/api/account/auth/form`, `/api/account/auth/refresh` | Public authentication entry, but the service issues management sessions only to current admins |
| UI metadata | GET/HEAD `/api/i18n/{lang}`, `/api/apps/hierarchy` | Existing public read; other template definitions are management operations |
| Public status | GET/HEAD `/api/status/page/public/org`, `/component`, `/component/{id}`, `/incident` | Existing public status responses; management writes are not exempt |
| Prometheus push | POST `/api/push/prometheus/**` | Existing anonymous push policy and protocol validation |
| OTLP HTTP | POST `/api/otlp/v1/logs`, `/metrics`, `/traces` | Existing authenticated `[admin,user]` ingestion rules, guest is not added |
| Legacy OTLP log aliases | POST `/api/logs/otlp/v1/logs`, `/api/logs/ingest/otlp` | Same existing ingestion authentication; other protocols are not added |
| Alertmanager ingestion | POST `/api/v2/alerts` | Existing authenticated `[admin,user]` machine ingestion rule |
| Health probes | GET/HEAD `/actuator/health`, `/actuator/health/liveness`, `/actuator/health/readiness` | Existing deployment authentication; the shipped Actuator rule is admin-only, no new default public health endpoint |
| Prometheus scrape | GET/HEAD `/actuator/prometheus` | Existing deployment authentication; shipped rule remains admin-only |
| Collector transport | Existing port 1158 protocol | Unchanged; this HTTP management migration does not modify its protocol or authentication |

The legacy `user` name remains only in the existing protected machine-ingestion rules to avoid promoting or breaking those credentials. It no longer authorizes any management operation. Legacy machine credentials still expire or are revoked according to their existing mechanisms; this release does not add a new restricted automation-token system. Static web assets remain readable so login and public status pages can load.

## Validation and rollout

Validate with synthetic credentials and local targets before production rollout. Confirm API requests as well as button visibility, keep authentication enabled, and retain a reviewed copy of the deployment configuration. This permission migration is separate from other 1.9.1 validation, credential-handling and diagnostic hardening fixes; it does not replace those fixes or claim that the full security surface has been tested.

## Login guidance and update notice

The login page explains the migration before authentication. Failed sign-in and refresh responses use a common message without confirming whether an account exists or identifying its roles. Ask the deployment administrator to review the account source; the login UI cannot migrate an account.

The existing About dialog displays the 1.9.1 migration notice on the first management visit for this version, even if earlier About notices were disabled. The browser remembers the displayed version, so an ordinary refresh does not reopen it. The first migration notice remains until dismissed; later logins retain the existing About opt-out/timed behavior, and the user menu can reopen it. This browser preference does not affect backend authorization.
