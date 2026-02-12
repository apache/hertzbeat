---
id: zookeeper_sd
title: Monitoring Zookeeper Service Discovery
sidebar_label: Zookeeper Service Discovery
keywords: [open source monitoring tool, open source service discovery monitoring tool, monitoring Zookeeper service discovery]
---

> HertzBeat integrates with Zookeeper to automatically discover service instances stored in Zookeeper nodes and create monitoring tasks for them.

### Overview

Zookeeper Service Discovery allows HertzBeat to connect to your Zookeeper server and automatically discover service instance information stored in specific path nodes. This is commonly used in Dubbo and other RPC frameworks that use Zookeeper as a registry center. When service instances change, HertzBeat will automatically create or delete corresponding monitoring tasks.

### PreRequisites

#### Deploy Zookeeper Server

1. Deploy Zookeeper server according to [Zookeeper official documentation](https://zookeeper.apache.org/doc/current/zookeeperStarted.html).
2. Ensure Zookeeper server is accessible from HertzBeat.
3. Verify Zookeeper is running properly using Zookeeper client tools

### Configuration parameter

|   Parameter name    |                                                Parameter help description                                                |
|---------------------|--------------------------------------------------------------------------------------------------------------------------|
| Target Name         | Identify the name of this monitoring. The name needs to be unique.                                                       |
| Service Discovery Url | Zookeeper server connection address. Example: `192.168.1.100:2181` or `zk1:2181,zk2:2181,zk3:2181` (cluster mode)         |
| Service Discovery Path Prefix | The path prefix in Zookeeper for service discovery. Example: `/dubbo` or `/services`                                      |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds. |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here.                  |

### Usage Steps

1. **Create Service Discovery Monitoring**
   - In HertzBeat web UI, navigate to **Monitoring** → **New Monitoring**
   - Select monitoring type: **Zookeeper Service Discovery**
   - Fill in the basic configuration parameters

2. **Configure Monitoring Template**
   - After creating the service discovery monitoring, you need to specify a monitoring template
   - The template defines what type of monitoring to create for discovered service instances
   - For example: If discovered instances are Dubbo services, you can select Port monitoring template
   - Common template types: Port, HTTP, Ping, etc.

3. **Automatic Discovery**
   - HertzBeat will periodically query Zookeeper based on the collection interval
   - Automatically create monitoring tasks for newly discovered service instances
   - Automatically delete monitoring tasks for disappeared service instances

4. **View Discovered Instances**
   - In the monitoring list, you can see all automatically created sub-monitoring tasks
   - Each sub-monitoring task corresponds to a discovered service instance

### Example of usage

#### Example 1: Dubbo Service Discovery

Suppose you have a Dubbo service registry running in Zookeeper at `192.168.1.100:2181`, and service information is stored under the `/dubbo` path.

Configuration example:

- **Target Name**: `Zookeeper-Dubbo-Discovery`
- **Service Discovery Url**: `192.168.1.100:2181`
- **Service Discovery Path Prefix**: `/dubbo`
- **Collection interval**: `60` seconds
- **Monitoring Template**: Select `Port` monitoring

After configuration:

1. HertzBeat connects to Zookeeper
2. Retrieves all child nodes under the `/dubbo` path
3. Parses node information to extract service instance host and port
4. Automatically creates Port monitoring for each service instance

#### Example 2: Custom Service Discovery

If you have a custom service registration mechanism using Zookeeper, and service information is stored under the `/services` path:

- **Service Discovery Url**: `zk1:2181,zk2:2181,zk3:2181` (Zookeeper cluster)
- **Service Discovery Path Prefix**: `/services`

HertzBeat will discover all service instances under this path.

### Notes

- **Node Format**: Zookeeper service discovery expects child nodes to contain host:port information
  - Example node name format: `192.168.1.101:8080` or similar formats
- **Network Connectivity**: Ensure HertzBeat can access the Zookeeper server address and port (default: 2181)
- **Monitoring Templates**: Service discovery only discovers service instance addresses, you need to configure appropriate monitoring templates to actually monitor the instances
- **Collection Interval**: Recommended minimum interval is 60 seconds to avoid excessive requests to Zookeeper
- **Path Prefix**: Ensure the path prefix is correct and HertzBeat has permission to read nodes under this path
- **Cluster Mode**: Supports Zookeeper cluster mode, multiple addresses can be separated by commas
- **Instance Naming**: Automatically created monitoring tasks are named based on node information

### Collection Metric

#### Metric set: Monitor Target

|   Metric name   | Metric unit |          Metric help description           |
|-----------------|-------------|--------------------------------------------|
| target          | none        | Discovered service instance target        |
| host            | none        | Service instance host address              |
| port            | none        | Service instance port number               |

### Use Cases

- **Dubbo Services**: Automatically monitor Dubbo service providers and consumers registered in Zookeeper
- **RPC Frameworks**: Monitor RPC services using Zookeeper as a registry
- **Custom Registration**: Monitor services using custom Zookeeper-based service registration
- **Distributed Systems**: Manage monitoring of distributed system components using Zookeeper for coordination
- **Service Governance**: Centrally manage monitoring of services in the Zookeeper service ecosystem

### Common Dubbo Path Structure

For Dubbo services, typical Zookeeper path structures include:

- `/dubbo/{serviceName}/providers` - Service provider addresses
- `/dubbo/{serviceName}/consumers` - Service consumer addresses
- `/dubbo/{serviceName}/routers` - Routing rules
- `/dubbo/{serviceName}/configurators` - Configuration overrides

When using Zookeeper service discovery with Dubbo, it's recommended to set the path prefix to `/dubbo` to discover all Dubbo services.
