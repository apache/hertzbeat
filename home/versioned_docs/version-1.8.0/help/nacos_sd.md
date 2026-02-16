---
id: nacos_sd
title: Monitoring Nacos Service Discovery
sidebar_label: Nacos Service Discovery
keywords: [open source monitoring tool, open source service discovery monitoring tool, monitoring Nacos service discovery]
---

> HertzBeat integrates with Nacos registry to automatically discover service instances and create monitoring tasks for them.

### Overview

Nacos Service Discovery allows HertzBeat to connect to your Nacos server and automatically discover all registered service instances. When a new service instance is registered or an existing instance goes offline, HertzBeat will automatically create or delete corresponding monitoring tasks, achieving automated monitoring in microservice environments.

### PreRequisites

#### Deploy Nacos Server

1. Deploy Nacos server according to [Nacos official documentation](https://nacos.io/en-us/docs/quick-start.html).
2. Ensure Nacos server is accessible from HertzBeat.
3. Verify that you can access Nacos console at `http://your-nacos-server:8848/nacos/`
4. Default credentials: username `nacos`, password `nacos`

### Configuration parameter

|   Parameter name    |                                                Parameter help description                                                |
|---------------------|--------------------------------------------------------------------------------------------------------------------------|
| Target Name         | Identify the name of this monitoring. The name needs to be unique.                                                       |
| Nacos Service Discovery Host | Nacos server IP address or domain name. Note⚠️Without protocol header (eg: https://, http://). Example: `nacos-server` or `192.168.1.100` |
| Nacos Service Discovery Port | Port provided by the Nacos server. The default is 8848                                                                    |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds. |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here.                  |

### Usage Steps

1. **Create Service Discovery Monitoring**
   - In HertzBeat web UI, navigate to **Monitoring** → **New Monitoring**
   - Select monitoring type: **Nacos Service Discovery**
   - Fill in the basic configuration parameters

2. **Configure Monitoring Template**
   - After creating the service discovery monitoring, you need to specify a monitoring template
   - The template defines what type of monitoring to create for discovered service instances
   - For example: If discovered instances are HTTP services, you can select HTTP monitoring template
   - Common template types: Port, HTTP, HTTPS, etc.

3. **Automatic Discovery**
   - HertzBeat will periodically query Nacos server based on the collection interval
   - Automatically create monitoring tasks for newly registered service instances
   - Automatically delete monitoring tasks for offline service instances

4. **View Discovered Instances**
   - In the monitoring list, you can see all automatically created sub-monitoring tasks
   - Each sub-monitoring task corresponds to a discovered service instance

### Example of usage

Suppose your Nacos server is running at `192.168.1.100:8848`, and you want to automatically monitor all service instances registered in it.

Configuration example:

- **Target Name**: `Nacos-Service-Discovery`
- **Nacos Service Discovery Host**: `192.168.1.100`
- **Nacos Service Discovery Port**: `8848`
- **Collection interval**: `60` seconds
- **Monitoring Template**: Select `Port` monitoring (to detect instance availability)

After configuration:

1. HertzBeat connects to Nacos server
2. Retrieves all registered service instances (including healthy and unhealthy instances)
3. Automatically creates Port monitoring for each instance (e.g., `user-service-192.168.1.101:8080`)
4. Every 60 seconds, checks for newly registered or offline services and updates monitoring tasks accordingly

### Notes

- **Network Connectivity**: Ensure HertzBeat can access the Nacos server address and port
- **Monitoring Templates**: Service discovery only discovers service instance addresses, you need to configure appropriate monitoring templates to actually monitor the instances
- **Collection Interval**: Recommended minimum interval is 60 seconds to avoid excessive requests to Nacos server
- **Namespace**: By default, discovers services in the public namespace. If you need to discover services in a specific namespace, you may need to configure it separately
- **Health Check**: Nacos service discovery will discover all instances, including unhealthy ones
- **Instance Naming**: Automatically created monitoring tasks are named in the format: `{ServiceName}-{Host}:{Port}`

### Collection Metric

#### Metric set: Monitor Target

|   Metric name   | Metric unit |          Metric help description           |
|-----------------|-------------|--------------------------------------------|
| target          | none        | Discovered service instance target        |
| host            | none        | Service instance host address              |
| port            | none        | Service instance port number               |

### Use Cases

- **Spring Cloud Alibaba**: Automatically monitor all microservice instances registered in Nacos
- **Dynamic Scaling**: Automatically adapt to service instances added/removed due to autoscaling
- **Unified Monitoring**: Centrally manage monitoring of all services in the microservice environment
- **Multi-Environment**: Manage services across development, testing, and production environments
- **Service Governance**: Combine with Nacos service governance capabilities for comprehensive service management
