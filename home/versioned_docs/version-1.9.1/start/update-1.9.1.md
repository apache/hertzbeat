---
id: 1.9.1-update
title: How to update to 1.9.1
sidebar_label: Update to 1.9.1 guide
---

## HertzBeat 1.9.1 Upgrade Guide

This release includes substantial security hardening and bug fixes, introduces no database schema changes, and is strongly recommended for users upgrading from 1.9.0.

:::warning Check these changes before upgrading

- **Management access requires the exact `admin` role.** Existing `user`, `guest`, and other non-admin accounts will not be able to use the management UI or API. Before upgrading, manually grant `admin` only to the people authorized to manage this HertzBeat instance. Do not promote every account.
- **Digest authentication is disabled in the shipped `application.yml`.** Replacing an image or package does not change an existing mounted or preserved file, so an old `digest` entry in `sureness.auths` stays active. Check the file the manager actually uses; remove only `digest` if you intend to disable it, keep the other required methods and secrets, then restart and verify.
:::

This guide covers upgrades from the official 1.9.0 release to the official 1.9.1 release. Use the matching manager and Collector artifacts from the same release. Wait for the official 1.9.1 artifacts before using them in production.

There are no new Flyway migration files between formal `v1.9.0` and the verified 1.9.1 source. The release adds no Flyway SQL migration files, but its credential migration may update existing database records; review management accounts and your active authentication configuration as described above.

## 1. Back up your deployment

Before changing anything, record the current image or package, startup options, mounted paths, and Collector versions. Keep the 1.9.0 artifacts for rollback.

Back up the metadata database and your deployment files: `application.yml`, `sureness.yml`, certificates and secret files, `compose.yaml`, `.env`, Kubernetes manifests, ConfigMaps, and Secrets. Stop HertzBeat before copying an embedded H2 database; use a consistent backup for MySQL or PostgreSQL. Also save custom files in `define/` and custom JARs in `ext-lib/`. Keep backups that may contain credentials or private keys protected.

## 2. Stop the current service

Schedule a maintenance window and stop the manager before replacing files or changing mounted configuration. If your deployment has remote Collectors, plan to upgrade them to the matching 1.9.1 artifacts and verify their reconnection before ending the maintenance window.

## 3. Upgrade Docker deployments

Keep the current data and configuration mounts. Do not run `docker compose down -v`.

For Compose, after the official image is published, change the HertzBeat image to `apache/hertzbeat:1.9.1`, keep your existing volumes, environment, ports, and secret references, then recreate the service:

```bash
docker compose config
docker compose pull hertzbeat
docker compose up -d hertzbeat
docker compose logs --follow hertzbeat
```

For a container started with `docker run`, first use `docker inspect hertzbeat` to record its mounts and volume names. Pull the new image, stop and remove the old container without deleting its volumes, then rerun your saved command with only the image changed. Reattach anonymous volumes by their recorded volume names; repeating `-v /container/path` alone creates a new empty volume.

```bash
docker pull apache/hertzbeat:1.9.1
docker stop hertzbeat
docker rm hertzbeat
# Rerun your saved docker run command with the image changed to apache/hertzbeat:1.9.1.
```

Do not add `-v` to `docker rm`.

## 4. Upgrade installation packages

The example uses `/opt/hertzbeat`; replace it with your installation path. Stop the manager using the shutdown command for your deployment. For the standard package scripts:

```bash
cd /opt/hertzbeat-1.9.0
./bin/shutdown.sh
```

Extract the complete 1.9.1 package into a new directory, such as `/opt/hertzbeat-1.9.1`. Start with its `config/` files and merge in your deployment-specific settings and secrets. If you use embedded H2, copy the stopped service's `data/` directory. If you use an external database, confirm that the new installation can reach the backed-up database.

Copy your reviewed custom templates and JARs into the new `define/` and `ext-lib/` directories. Keep the new package's `bin/` and `lib/`; do not copy those directories from 1.9.0 or replace only the main JAR. Then start the new package:

```bash
cd /opt/hertzbeat-1.9.1
./bin/startup.sh
```

## 5. Merge and check your configuration

Use the 1.9.1 `sureness.yml` as the starting point and carefully merge your reviewed account and policy settings. Manually give the exact `admin` role to approved administrators. Preserve each account's existing identifier and credential. Do not replace the complete 1.9.1 file with an older copy. Old tokens do not bypass the role check or grant `admin`; approved administrators should sign in again after the manager restarts.

Check the `application.yml` actually mounted by the manager. The shipped 1.9.1 file uses Basic and JWT and leaves Digest disabled. If you want that behavior, the active `sureness.auths` list should contain `basic` and `jwt`, without `digest`:

```yaml
sureness:
  auths: [basic, jwt]
```

If you intentionally use Digest, keep it in the active list along with the other methods your deployment needs:

```yaml
sureness:
  auths: [basic, jwt, digest]
```

When editing an existing file, change only the authentication entry needed for your policy. Keep `sureness.jwt.secret` and other settings. Digest is HTTP challenge-response authentication, not encryption of passwords or network traffic; use TLS for confidentiality. Restart the manager after changing the file.

Preserve the existing `common.secret`: changing it can make stored credentials unreadable. Verify credential edits with a masked value, password replacement, monitor import and export, and subsequent collection in a test environment. Masked exports do not supply the original secret; provide it again when required. See [admin migration](../help/admin_only_migration) and [security model](../help/security_model) for the access boundary.

## 6. Verify the upgrade

Check the manager startup logs for database or configuration errors. Confirm that an approved administrator can sign in and that non-admin accounts cannot access management functions. Test authentication against a protected endpoint and confirm that Digest behavior matches the active configuration; a public route alone is not a useful Digest check.

Upgrade remote Collectors from the same official 1.9.1 release. Confirm each Collector reconnects and that a representative monitor receives fresh data. Port `1158` carries manager-to-Collector traffic; allow access only from Collector networks that need it. The management account change does not alter the existing Collector transport authentication.

## 7. Roll back if checks fail

Stop the 1.9.1 manager and affected Collectors. Restore the complete 1.9.0 image or package, its matching configuration and deployment files, and your saved `define/` and `ext-lib/` contents. If 1.9.1 wrote to the database, restore the consistent pre-upgrade database backup before starting 1.9.0. Do not roll back by swapping only a JAR. Keep the backups until the restored service is verified.
