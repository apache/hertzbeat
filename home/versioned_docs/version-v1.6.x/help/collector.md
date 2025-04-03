---
id: collector
title: HertzBeat Collector
sidebar_label: Collector 
keywords: [monitoring, observability, collector, metrics]
---

> HertzBeat Collector is a lightweight data collection module that enables metrics collection, high availability deployments, and cloud-edge collaboration in Apache HertzBeat (incubating).

## Introduction

HertzBeat Collector is a versatile and lightweight metrics collection module within the Apache HertzBeat monitoring system. It's designed to gather monitoring data from various targets and send the collected metrics to the main HertzBeat server for processing, alerting, and visualization.

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
- `-v $(pwd)/logs:/opt/hertzbeat-collector/logs`: (Optional) Mount the log files to the local host.

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
