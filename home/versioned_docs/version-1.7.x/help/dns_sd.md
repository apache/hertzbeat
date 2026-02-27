---
id: dns_sd
title: Monitoring DNS Service Discovery
sidebar_label: DNS Service Discovery
keywords: [open source monitoring tool, open source service discovery monitoring tool, monitoring DNS service discovery]
---

> HertzBeat integrates with DNS service to automatically discover service instances through DNS records and create monitoring tasks for them.

### Overview

DNS Service Discovery allows HertzBeat to discover service instances by querying DNS records. This is a simple and reliable service discovery method that utilizes standard DNS infrastructure to find service instances. It is particularly suitable for environments using DNS SRV records or environments that need to discover services through DNS.

### PreRequisites

#### Configure DNS Records

Ensure your DNS server has properly configured service discovery records. Different record types have different formats:

1. **SRV Records**: Used for service discovery, containing service host and port information
2. **A Records**: Return IPv4 addresses
3. **AAAA Records**: Return IPv6 addresses
4. **MX Records**: Mail server records
5. **NS Records**: Name server records

### Configuration parameter

|   Parameter name    |                                                Parameter help description                                                |
|---------------------|--------------------------------------------------------------------------------------------------------------------------|
| Target Name         | Identify the name of this monitoring. The name needs to be unique.                                                       |
| DNS Host            | DNS server address. Example: `8.8.8.8` or `192.168.1.1`                                                                  |
| DNS Port            | DNS server port. The default is 53                                                                                       |
| Record Type         | Type of DNS record to query. Options: `SRV`, `A`, `AAAA`, `MX`, `NS`                                                     |
| Record Name         | Name of the DNS record to query. Example: `_http._tcp.example.com` for SRV records                                       |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds. |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here.                  |

### Usage Steps

1. **Create Service Discovery Monitoring**
   - In HertzBeat web UI, navigate to **Monitoring** → **New Monitoring**
   - Select monitoring type: **DNS Service Discovery**
   - Fill in the basic configuration parameters

2. **Configure Monitoring Template**
   - After creating the service discovery monitoring, you need to specify a monitoring template
   - The template defines what type of monitoring to create for discovered service instances
   - For SRV records, commonly used templates include Port, HTTP, etc.
   - For A/AAAA records, Ping or Port monitoring can be used

3. **Automatic Discovery**
   - HertzBeat will periodically query the DNS server based on the collection interval
   - Automatically create monitoring tasks for newly discovered service instances
   - Automatically delete monitoring tasks for disappeared service instances

4. **View Discovered Instances**
   - In the monitoring list, you can see all automatically created sub-monitoring tasks
   - Each sub-monitoring task corresponds to a discovered service instance

### Example of usage

#### Example 1: SRV Record Discovery

Suppose you have an SRV record for your web service:

- **SRV Record**: `_http._tcp.example.com`
- **DNS Server**: `8.8.8.8`
- **Expected discovery**: Automatically discover all HTTP service instances

Configuration example:

- **Target Name**: `DNS-SRV-Discovery`
- **DNS Host**: `8.8.8.8`
- **DNS Port**: `53`
- **Record Type**: Select `SRV`
- **Record Name**: `_http._tcp.example.com`
- **Collection interval**: `60` seconds
- **Monitoring Template**: Select `Port` monitoring (using the port from SRV record)

After configuration:

1. HertzBeat queries the SRV record for `_http._tcp.example.com`
2. Extracts host and port information from the SRV record response
3. Automatically creates Port monitoring for each service instance

#### Example 2: A Record Discovery

Discover service instances through A records:

- **A Record**: `services.example.com`
- This domain may resolve to multiple IP addresses

Configuration example:

- **DNS Host**: `192.168.1.1` (Internal DNS server)
- **DNS Port**: `53`
- **Record Type**: Select `A`
- **Record Name**: `services.example.com`
- **Monitoring Template**: Select `Ping` or `Port` monitoring

#### Example 3: MX Record Discovery

Discover mail servers through MX records:

- **DNS Host**: `8.8.8.8`
- **Record Type**: Select `MX`
- **Record Name**: `example.com`
- **Monitoring Template**: Select `Port` monitoring (port 25)

### DNS Record Types

#### SRV Records (Recommended)

SRV records are the most commonly used record type for service discovery, containing service name, port number, and priority information.

Format: `_service._protocol.example.com`

Example: `_http._tcp.example.com`

Typical SRV record response contains:

- Target domain name
- Port number
- Priority and weight

#### A Records

A records map domain names to IPv4 addresses. If a domain name resolves to multiple IPs, all IPs can be discovered.

Example: `services.example.com` → `192.168.1.10`, `192.168.1.11`, `192.168.1.12`

#### AAAA Records

AAAA records map domain names to IPv6 addresses.

Example: `services.example.com` → `2001:db8::1`

#### MX Records

MX records specify mail servers for a domain and include priority information.

Example: `example.com` → `mail.example.com`

#### NS Records

NS records specify name servers for a domain.

Example: `example.com` → `ns1.example.com`

### Notes

- **DNS Server**: Ensure the specified DNS server is accessible and contains the service discovery records
- **Record Name**: Record name must be accurate, including the service and protocol prefix for SRV records
- **Port Information**:
  - SRV records contain port information
  - A/AAAA records do not contain port information; a default port needs to be specified in the monitoring template
- **Monitoring Templates**: Service discovery only discovers service instance addresses; you need to configure appropriate monitoring templates to actually monitor the instances
- **Collection Interval**: Recommended minimum interval is 60 seconds to avoid excessive DNS queries
- **DNS Caching**: DNS responses may be cached; the actual update frequency depends on the DNS record's TTL value
- **Network Connectivity**: Ensure HertzBeat can access the specified DNS server and port (default: 53)
- **Firewall**: Ensure firewalls allow DNS query traffic (UDP/TCP 53)

### Collection Metric

#### Metric set: Monitor Target

|   Metric name   | Metric unit |          Metric help description           |
|-----------------|-------------|--------------------------------------------|
| target          | none        | Discovered service instance target        |
| host            | none        | Service instance host address              |
| port            | none        | Service instance port number               |

### Use Cases

- **Kubernetes Headless Services**: Discover Kubernetes pod instances through DNS
- **Cloud Services**: Discover cloud service instances (AWS Route53, Azure DNS, GCP Cloud DNS)
- **Traditional DNS**: Use existing DNS infrastructure for service discovery
- **Load Balancing**: Discover all backend server instances
- **Mail Servers**: Discover mail server instances through MX records
- **Multi-Environment**: Use different DNS records for service discovery across different environments

### Common SRV Record Formats

Different services use different SRV record formats:

- **HTTP**: `_http._tcp.example.com`
- **HTTPS**: `_https._tcp.example.com`
- **LDAP**: `_ldap._tcp.example.com`
- **FTP**: `_ftp._tcp.example.com`
- **MySQL**: `_mysql._tcp.example.com`
- **PostgreSQL**: `_postgresql._tcp.example.com`

### Kubernetes Integration

In Kubernetes clusters, DNS service discovery can be used to discover pod instances:

1. **Headless Services**: Kubernetes creates DNS A records for each pod of headless services
2. **Service Discovery**: Use DNS service discovery to monitor all pods of a specific service

Example:

- **DNS Host**: Kubernetes cluster DNS service IP (usually `10.96.0.10`)
- **Record Type**: `A`
- **Record Name**: `my-service.default.svc.cluster.local`
- **Monitoring Template**: `Port` monitoring

### DNS Server Examples

Commonly used DNS servers:

- **Google Public DNS**: `8.8.8.8`, `8.8.4.4`
- **Cloudflare DNS**: `1.1.1.1`, `1.0.0.1`
- **Quad9 DNS**: `9.9.9.9`
- **OpenDNS**: `208.67.222.222`, `208.67.220.220`
- **Internal DNS**: Usually the enterprise's internal DNS server address

### Best Practices

1. **Use SRV Records**: SRV records are the recommended method for service discovery as they contain complete host and port information
2. **Set Proper TTL**: Set an appropriate DNS record TTL to balance real-time performance and DNS server load
3. **Redundancy**: Configure multiple DNS servers to ensure high availability
4. **Monitoring**: Regularly check DNS record validity and availability
5. **Security**: Ensure DNS queries are secure, consider using DNS over HTTPS (DoH) or DNS over TLS (DoT)
