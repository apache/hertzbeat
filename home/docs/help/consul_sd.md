---
id: consul_sd
title: Monitoring Consul Service Discovery
sidebar_label: Consul Service Discovery
keywords: [open source monitoring tool, open source service discovery monitoring tool, monitoring Consul service discovery]
---

> HertzBeat integrates with Consul registry to automatically discover service instances and create monitoring tasks for them.

### Overview

Consul Service Discovery allows HertzBeat to connect to your Consul server and automatically discover all registered service instances. When a new service instance is registered or an existing instance goes offline, HertzBeat will automatically create or delete corresponding monitoring tasks, achieving automated monitoring in microservice environments.

### PreRequisites

#### Deploy Consul Server

1. Deploy Consul server according to [Consul official documentation](https://www.consul.io/docs/install).
2. Ensure Consul server is accessible from HertzBeat.
3. Verify that you can access Consul UI at `http://your-consul-server:8500/ui/`
4. Ensure the Consul HTTP API is accessible (default port: 8500)

### Configuration parameter

|   Parameter name    |                                                Parameter help description                                                |
|---------------------|--------------------------------------------------------------------------------------------------------------------------|
| Target Name         | Identify the name of this monitoring. The name needs to be unique.                                                       |
| Consul Host         | Consul server IP address or domain name. Note⚠️Without protocol header (eg: https://, http://). Example: `consul-server` or `192.168.1.100` |
| Consul Port         | Port provided by the Consul server. The default is 8500                                                                  |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds. |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here.                  |

### Usage Steps

1. **Create Service Discovery Monitoring**
   - In HertzBeat web UI, navigate to **Monitoring** → **New Monitoring**
   - Select monitoring type: **Consul Service Discovery**
   - Fill in the basic configuration parameters

2. **Configure Monitoring Template**
   - After creating the service discovery monitoring, you need to specify a monitoring template
   - The template defines what type of monitoring to create for discovered service instances
   - For example: If discovered instances are HTTP services, you can select HTTP monitoring template
   - Common template types: Port, HTTP, HTTPS, Ping, etc.

3. **Automatic Discovery**
   - HertzBeat will periodically query Consul server based on the collection interval
   - Automatically create monitoring tasks for newly registered service instances
   - Automatically delete monitoring tasks for offline service instances

4. **View Discovered Instances**
   - In the monitoring list, you can see all automatically created sub-monitoring tasks
   - Each sub-monitoring task corresponds to a discovered service instance

### Example of usage

Suppose your Consul server is running at `192.168.1.100:8500`, and you want to automatically monitor all service instances registered in it.

Configuration example:

- **Target Name**: `Consul-Service-Discovery`
- **Consul Host**: `192.168.1.100`
- **Consul Port**: `8500`
- **Collection interval**: `60` seconds
- **Monitoring Template**: Select `Port` monitoring (to detect instance availability)

After configuration:

1. HertzBeat connects to Consul server via HTTP API
2. Retrieves all registered service instances
3. Automatically creates Port monitoring for each instance (e.g., `api-service-192.168.1.101:8080`)
4. Every 60 seconds, checks for newly registered or offline services and updates monitoring tasks accordingly

### Notes

- **Network Connectivity**: Ensure HertzBeat can access the Consul server address and port (default: 8500)
- **Monitoring Templates**: Service discovery only discovers service instance addresses, you need to configure appropriate monitoring templates to actually monitor the instances
- **Collection Interval**: Recommended minimum interval is 60 seconds to avoid excessive requests to Consul server
- **ACL Token**: If Consul is configured with ACL (Access Control List), you may need to configure the appropriate token
- **Service Health**: Consul service discovery will discover both healthy and unhealthy instances
- **Datacenter**: By default, discovers services in the local datacenter. If you need to discover services in a specific datacenter, additional configuration may be required
- **Instance Naming**: Automatically created monitoring tasks are named in the format: `{ServiceName}-{Host}:{Port}`

### Collection Metric

#### Metric set: Monitor Target

|   Metric name   | Metric unit |          Metric help description           |
|-----------------|-------------|--------------------------------------------|
| target          | none        | Discovered service instance target        |
| host            | none        | Service instance host address              |
| port            | none        | Service instance port number               |

### Use Cases

- **Microservice Architecture**: Automatically monitor all microservice instances registered in Consul
- **Service Mesh**: Monitor services using Consul Connect service mesh
- **Multi-Datacenter**: Monitor service instances across multiple Consul datacenters
- **Dynamic Scaling**: Automatically adapt to service instances added/removed due to autoscaling
- **Health Check**: Combine with Consul's health check mechanism to monitor service health status
- **Service Governance**: Centrally manage monitoring of all services in the Consul service ecosystem

### Integration with Consul Features

- **Service Health**: Consul service discovery can leverage Consul's health check information
- **Service Tags**: Service instances discovered from Consul may include tag information
- **KV Storage**: Can be used in conjunction with Consul KV storage to achieve more flexible service discovery
- **Service Mesh**: Supports service discovery in Consul Connect service mesh environment
