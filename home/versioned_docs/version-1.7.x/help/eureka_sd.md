---
id: eureka_sd
title: Monitoring Eureka Service Discovery
sidebar_label: Eureka Service Discovery
keywords: [open source monitoring tool, open source service discovery monitoring tool, monitoring Eureka service discovery]
---

> HertzBeat integrates with Eureka registry to automatically discover service instances and create monitoring tasks for them.

### Overview

Eureka Service Discovery allows HertzBeat to connect to your Eureka server and automatically discover all registered service instances. When a new service instance is registered or an existing instance goes offline, HertzBeat will automatically create or delete corresponding monitoring tasks, achieving automated monitoring in microservice environments.

### PreRequisites

#### Deploy Eureka Server

1. Deploy Eureka server according to [Eureka official documentation](https://spring.io/guides/gs/service-registration-and-discovery/).
2. Ensure Eureka server is accessible from HertzBeat.
3. Verify that you can access Eureka dashboard at `http://your-eureka-server:port/`

### Configuration parameter

|   Parameter name    |                                               Parameter help description                                                |
|---------------------|-------------------------------------------------------------------------------------------------------------------------|
| Target Name         | Identify the name of this monitoring. The name needs to be unique                                                       |
| Eureka Service Discovery Url | Eureka server address. Example: `http://eureka-server:8761/eureka`                                                    |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                  |

### Usage Steps

1. **Create Service Discovery Monitoring**
   - In HertzBeat web UI, navigate to **Monitoring** → **New Monitoring**
   - Select monitoring type: **Eureka Service Discovery**
   - Fill in the basic configuration parameters

2. **Configure Monitoring Template**
   - After creating the service discovery monitoring, you need to specify a monitoring template
   - The template defines what type of monitoring to create for discovered service instances
   - For example: If discovered instances are HTTP services, you can select HTTP monitoring template
   - Common template types: Port, HTTP, HTTPS, etc.

3. **Automatic Discovery**
   - HertzBeat will periodically query Eureka server based on the collection interval
   - Automatically create monitoring tasks for newly registered service instances
   - Automatically delete monitoring tasks for offline service instances

4. **View Discovered Instances**
   - In the monitoring list, you can see all automatically created sub-monitoring tasks
   - Each sub-monitoring task corresponds to a discovered service instance

### Example of usage

Suppose your Eureka server is running at `http://192.168.1.100:8761/eureka`, and you want to automatically monitor all service instances registered in it.

Configuration example:

- **Target Name**: `Eureka-Service-Discovery`
- **Eureka Service Discovery Url**: `http://192.168.1.100:8761/eureka`
- **Collection interval**: `60` seconds
- **Monitoring Template**: Select `Port` monitoring (to detect instance availability)

After configuration:

1. HertzBeat connects to Eureka server
2. Retrieves all registered application instances
3. Automatically creates Port monitoring for each instance (e.g., `USER-SERVICE-192.168.1.101:8080`)
4. Every 60 seconds, checks for newly registered or offline services and updates monitoring tasks accordingly

### Notes

- **Network Connectivity**: Ensure HertzBeat can access the Eureka server address
- **Monitoring Templates**: Service discovery only discovers service instance addresses, you need to configure appropriate monitoring templates to actually monitor the instances
- **Collection Interval**: Recommended minimum interval is 60 seconds to avoid excessive requests to Eureka server
- **Permission Requirements**: Eureka server does not require authentication by default, but if authentication is configured, the URL needs to include username and password
- **Instance Naming**: Automatically created monitoring tasks are named in the format: `{ApplicationName}-{Host}:{Port}`

### Collection Metric

#### Metric set: Monitor Target

|   Metric name   | Metric unit |          Metric help description           |
|-----------------|-------------|--------------------------------------------|
| target          | none        | Discovered service instance target        |
| host            | none        | Service instance host address              |
| port            | none        | Service instance port number               |

### Use Cases

- **Microservice Architecture**: Automatically monitor all microservice instances registered in Eureka
- **Dynamic Scaling**: Automatically adapt to service instances added/removed due to autoscaling
- **Unified Monitoring**: Centrally manage monitoring of all services in the microservice environment
- **Operation and Maintenance**: Reduce manual configuration work and improve operation efficiency
