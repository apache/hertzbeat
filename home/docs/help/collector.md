---
id: collector
title: HertzBeat Collector
sidebar_label: Collector 
keywords: [monitoring, observability, collector, metrics]
---

> HertzBeat Collector is a lightweight data collection module that enables metrics collection, high availability deployments, and cloud-edge collaboration in Apache HertzBeat.

## Introduction

HertzBeat Collector is a versatile and lightweight metrics collection module within the Apache HertzBeat™ monitoring system. It's designed to gather monitoring data from various targets and send the collected metrics to the main HertzBeat server for processing, alerting, and visualization.

With the collector module, you can implement:

- **High Availability**: Deploy multiple collectors to ensure continuous monitoring even if some collector instances fail
- **Load Balancing**: Distribute monitoring tasks across multiple collectors to improve performance
- **Cloud-Edge Collaboration**: Monitor resources in isolated networks while managing everything from a central HertzBeat server

## Collector Architecture

The collector module is built with a modular design to make it easily extensible for various monitoring scenarios. The architecture consists of:

1. **Collector Entry Point**: The main entry point for running the collector module, from which collection tasks are executed after startup.

2. **collector-basic**: Contains implementations for common protocols like HTTP, JDBC, SSH, SNMP, etc. These collectors typically don't require additional proprietary dependencies and can handle most basic monitoring needs.

3. **collector-common**: Provides general utility classes and methods, such as connection pools and caching mechanisms that other modules can reuse.

4. **collector-xxx**: Extension modules for specific services or protocols (MongoDB, RocketMQ, Kafka, NebulaGraph, etc.). These modules often require specific dependencies for their respective services.

## Supported Protocols

HertzBeat Collector supports an extensive list of monitoring protocols:

| Protocol Category | Protocols                                                                             |
| ----------------- | ------------------------------------------------------------------------------------- |
| Web/API           | `http`, `ssl_cert`, `websocket`                                                       |
| Databases         | `jdbc`, `redis`, `mongodb`, `memcached`                                               |
| Operating Systems | `ssh`, `ipmi`                                                                         |
| Network           | `icmp` (ping), `telnet`, `snmp`, `modbus`                                             |
| Messaging         | `mqtt`, `rocketmq`, `kafka`                                                           |
| Email             | `pop3`, `smtp`, `imap`                                                                |
| Cloud Services    | `prometheus`, `nebulagraph`, `ngql`                                                   |
| Others            | `jmx`, `dns`, `ftp`, `ntp`, `udp`, `nginx`, `redfish`, `script`, `registry`, `httpsd` |

## Deployment Options

You can deploy HertzBeat Collector in several ways depending on your environment and needs, once you log in to the HertzBeat web interface and go to the collector, you can see the deployment options.

Parameters explanation:

- `-e IDENTITY=custom-collector-name`: (Optional) Set a unique identifier for this collector. Must be unique across all collectors.
- `-e MODE=public`: Set the running mode (public or private), for public cluster or private cloud-edge mode.
- `-e MANAGER_HOST=192.168.1.100`: Important! Set the IP address of the main HertzBeat server. Replace with your actual server IP.
- `-e MANAGER_PORT=1158`: (Optional) Set the port of the main HertzBeat server, default is 1158.
- `-v $(pwd)/ext-lib:/opt/hertzbeat-collector/ext-lib`: (Optional) Mount external JDBC driver jars to the local collector.
- `-v $(pwd)/logs:/opt/hertzbeat-collector/logs`: (Optional) Mount the log files to the local host.

The collector image keeps `/opt/hertzbeat-collector` as a version-independent root path, so `logs` and `ext-lib` mounts remain stable across upgrades.

## Operating Modes

HertzBeat Collector supports two operating modes:

### Public Mode (Cluster Mode)

In public mode, collectors form a cluster with the main HertzBeat server. Tasks are automatically distributed among collectors, providing high availability and load balancing.

- Set `MODE=public` when deploying the collector
- All collectors must have connectivity to the main HertzBeat server
- Great for horizontal scaling to handle large numbers of monitoring tasks

### Private Mode (Cloud-Edge Mode)

In private mode, collectors operate in isolated networks while still reporting to a central HertzBeat server. This allows monitoring of resources in multiple separate networks.

- Set `MODE=private` when deploying the collector
- Collectors need outbound connectivity to the HertzBeat server, but inbound connectivity is not required
- Ideal for monitoring resources across different data centers, cloud providers, or network segments

## Configuration Parameters

| Parameter      | Description                         | Default                   |
| -------------- | ----------------------------------- | ------------------------- |
| `identity`     | Unique identifier for the collector | Auto-generated if not set |
| `mode`         | Operating mode (public/private)     | public                    |
| `manager-host` | IP address of the HertzBeat server  | IP               |
| `manager-port` | Port of the HertzBeat server        | 1158                      |

## Cluster Message Authentication

Manager and standalone Collector authenticate Netty cluster messages with a
versioned, connection-bound HMAC envelope. A standalone Collector also needs
the same AES `COMMON_SECRET` used by Manager to process encrypted collection
data. Configure both values on both sides and keep them independent.

```yaml
common:
  secret: ${COMMON_SECRET:}

authentication:
  mode: required
  active-key-id: primary
  active-secret: ${CLUSTER_AUTH_ACTIVE_SECRET:}
  previous-key-id: ${CLUSTER_AUTH_PREVIOUS_KEY_ID:}
  previous-secret: ${CLUSTER_AUTH_PREVIOUS_SECRET:}
  max-clock-skew: 5m
  handshake-timeout: 3s
```

Generate both values once and store them in the deployment secret manager:

```shell
export COMMON_SECRET="$(openssl rand -hex 16)"
export CLUSTER_AUTH_ACTIVE_SECRET="$(openssl rand -hex 32)"
```

`openssl rand -hex 16` produces 32 ASCII bytes, which is a valid AES-256
`COMMON_SECRET`; the accepted AES lengths are exactly 16, 24, or 32 bytes.
`openssl rand -hex 32` produces a separate 64-character authentication secret
and must not be reused directly as `COMMON_SECRET`. Provision the same two
values on Manager and every standalone Collector, and preserve both across
restarts and upgrades. Blank, known-default, short authentication secrets and
invalid-length AES secrets are rejected during startup. Never put either value
in an image, command history, or public configuration file.

### Rolling Upgrade

Use this order to avoid interrupting collection:

1. Before changing binaries, preserve or establish the same valid-length
   `COMMON_SECRET` and configure the same independent
   `CLUSTER_AUTH_ACTIVE_SECRET` on Manager and every Collector. Explicitly set
   `CLUSTER_AUTH_MODE=optional` on every node. Older versions ignore the new
   authentication properties. Optional mode is only a mixed-version rollout
   setting; it is not the shipped steady-state default.
2. Upgrade Collectors first. A new optional Collector signs outbound traffic,
   while an old Manager ignores the added protobuf fields; the new Collector
   temporarily accepts the old Manager's unsigned responses.
3. Upgrade Manager instances. Optional Manager instances accept remaining
   unsigned Collectors and advertise a channel-binding challenge to new ones.
4. Wait until
   `hertzbeat.cluster.message.authentication.legacy.accepted` remains at zero
   and investigate every
   `hertzbeat.cluster.message.authentication.rejected` reason.
5. Remove the `CLUSTER_AUTH_MODE=optional` override (or explicitly set
   `mode: required`) on both sides. Required mode rejects unsigned peers and
   is the shipped default.

Do not upgrade Manager before its old Collectors have the new secret and
optional mode configured. The preceding local-key change intentionally stops
Manager from sending encryption key material over unauthenticated Netty.

### Key Rotation

The active key signs new traffic. The previous key is accepted only for
verification, which provides a dual-key transition:

1. Deploy the next key as `previous-key-id` and `previous-secret` everywhere.
2. Gradually make that key active, and retain the old key as previous.
3. Confirm that all instances use the new active key, then remove the old key.

An existing 16-byte `common.secret` may be supplied temporarily as the previous
secret while rotating to an independent 32-byte authentication secret. Key IDs
must be different and do not contain secret material.

### Replay and Clock Model

Manager sends a fresh random challenge for every Netty connection. The
challenge is covered by every subsequent signature, so a message captured from
one connection cannot be replayed through another Manager instance or after a
reconnect. A bounded local cache rejects duplicate signatures on the active
connection. This connection-level binding supports multi-Manager deployments
without a shared replay database.

Authentication timestamps use the configured `max-clock-skew`. Keep Manager
and Collector clocks synchronized. Stale, future, replayed, unknown-key,
malformed, channel-mismatched, and invalid-signature messages are counted by
low-cardinality rejection-reason metrics.

## Collector Management

You can manage collectors through the HertzBeat web interface:

1. Navigate to the Overview page to see all registered collectors
2. Monitor collector status (online/offline), metrics tasks, and system information
3. Enable or disable collectors as needed

## High Availability Setup

To achieve high availability with HertzBeat collectors:

1. Deploy multiple collector instances across different servers or containers
2. Ensure all collectors have the same `mode` setting
3. Connect all collectors to the same HertzBeat server
4. HertzBeat will automatically distribute monitoring tasks and handle failover

If a collector goes offline, its tasks will be reassigned to other available collectors. When the collector comes back online, it will receive new tasks based on the current load distribution.

## Cloud-Edge Collaboration

For monitoring across isolated networks:

1. Deploy HertzBeat Server in your central management network
2. Deploy collectors in each isolated network you need to monitor
3. Configure collectors with:
      - `MODE=private`
      - `MANAGER_HOST=` pointing to your central HertzBeat server
4. Ensure outbound connectivity from each isolated network to the central server
5. Manage all monitoring tasks from the central HertzBeat dashboard

## Advanced Features

### Custom Protocol Support

HertzBeat's architecture allows for extending the collector with custom protocols. Developers can create new collector modules following the project's modular design.

### Task Scheduling

The collector automatically handles task scheduling based on task priority, available resources, and current system load. Tasks are processed with intelligent prioritization to ensure critical monitoring is performed first.

### Resource Utilization

Collectors are designed to be lightweight and efficient with system resources, making them suitable for deployment on various hardware, from small edge devices to powerful servers.
