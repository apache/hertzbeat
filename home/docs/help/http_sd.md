---
id: http_sd
title: Monitoring HTTP Service Discovery
sidebar_label: HTTP Service Discovery
keywords: [open source monitoring tool, open source service discovery monitoring tool, monitoring HTTP service discovery]
---

> HertzBeat integrates with custom HTTP APIs to automatically discover service instances and create monitoring tasks for them.

### Overview

HTTP Service Discovery allows HertzBeat to discover service instances by calling your custom HTTP API. This is the most flexible service discovery method, suitable for any system that can expose service instance information via HTTP API. You only need to provide an HTTP endpoint that returns a list of target addresses in the specified format.

### PreRequisites

#### Prepare HTTP API

You need to provide or develop an HTTP API that meets the following requirements:

1. **HTTP Method**: Support GET requests
2. **Response Format**: Return JSON format data
3. **Response Structure**: Must contain a `targets` field, which is a string array. Each string is a service instance address in the format `host:port`
4. **Accessibility**: The API must be accessible from HertzBeat

#### API Response Example

```json
{
  "targets": [
    "192.168.1.101:8080",
    "192.168.1.102:8080",
    "192.168.1.103:8080",
    "api.example.com:443"
  ]
}
```

### Configuration parameter

|   Parameter name    |                                                Parameter help description                                                |
|---------------------|--------------------------------------------------------------------------------------------------------------------------|
| Target Name         | Identify the name of this monitoring. The name needs to be unique.                                                       |
| Service Discovery Url | HTTP API address for service discovery. Must start with http:// or https://. Example: `http://api.example.com/services` |
| Auth Type           | Authentication method, optional values: `Bearer Token`, `Basic Auth`, `Digest Auth`. Default: None                        |
| Access Token        | Token for authentication when Auth Type is Bearer Token.                                                                 |
| Username            | Username for authentication when Auth Type is Basic Auth or Digest Auth.                                                  |
| Password            | Password for authentication when Auth Type is Basic Auth or Digest Auth.                                                  |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds. |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here.                  |

### Usage Steps

1. **Prepare HTTP API**
   - Develop or configure an API endpoint that returns service instance list
   - Ensure the API returns JSON data in the correct format
   - Test the API accessibility and response format

2. **Create Service Discovery Monitoring**
   - In HertzBeat web UI, navigate to **Monitoring** → **New Monitoring**
   - Select monitoring type: **HTTP Service Discovery**
   - Fill in the basic configuration parameters
   - Configure authentication information if needed

3. **Configure Monitoring Template**
   - After creating the service discovery monitoring, you need to specify a monitoring template
   - The template defines what type of monitoring to create for discovered service instances
   - Common template types: Port, HTTP, HTTPS, Ping, etc.

4. **Automatic Discovery**
   - HertzBeat will periodically call your HTTP API based on the collection interval
   - Automatically create monitoring tasks for newly discovered service instances
   - Automatically delete monitoring tasks for disappeared service instances

### Example of usage

#### Example 1: API Without Authentication

Suppose you have a service management API:

- **API URL**: `http://service-manager.example.com/api/v1/services`
- **Response**:

  ```json
  {
    "targets": [
      "10.0.1.10:8080",
      "10.0.1.11:8080",
      "10.0.1.12:8080"
    ]
  }
  ```

Configuration example:

- **Target Name**: `HTTP-Service-Discovery`
- **Service Discovery Url**: `http://service-manager.example.com/api/v1/services`
- **Auth Type**: Leave empty (no authentication)
- **Collection interval**: `60` seconds
- **Monitoring Template**: Select `Port` monitoring

#### Example 2: API With Bearer Token Authentication

If your API requires Bearer Token authentication:

- **API URL**: `https://api.example.com/services`
- **Auth Type**: `Bearer Token`
- **Access Token**: `your-bearer-token-here`

Configuration example:

- **Target Name**: `Secure-API-Discovery`
- **Service Discovery Url**: `https://api.example.com/services`
- **Auth Type**: Select `Bearer Token`
- **Access Token**: Enter your token
- **Monitoring Template**: Select `HTTP` monitoring

#### Example 3: API With Basic Authentication

If your API requires Basic authentication:

- **API URL**: `http://api.internal.com/discover`
- **Auth Type**: `Basic Auth`
- **Username**: `admin`
- **Password**: `password123`

Configuration example:

- **Target Name**: `Basic-Auth-Discovery`
- **Service Discovery Url**: `http://api.internal.com/discover`
- **Auth Type**: Select `Basic Auth`
- **Username**: `admin`
- **Password**: `password123`
- **Monitoring Template**: Select appropriate template

### Notes

- **Response Format**: The API response must be in JSON format and contain a `targets` field (string array)
- **Address Format**: Each target address should be in the format `host:port`, for example:
  - `192.168.1.100:8080`
  - `api.example.com:443`
  - `localhost:3000`
- **Network Connectivity**: Ensure HertzBeat can access the HTTP API address
- **Monitoring Templates**: Service discovery only discovers service instance addresses, you need to configure appropriate monitoring templates to actually monitor the instances
- **Collection Interval**: Set a reasonable collection interval based on API performance and service change frequency
- **Authentication**: Choose the appropriate authentication method according to your API security requirements
- **HTTPS**: If using HTTPS, ensure SSL certificates are properly configured
- **API Performance**: Ensure the API can respond quickly to avoid affecting HertzBeat performance
- **Error Handling**: If the API returns an error or invalid format, HertzBeat will keep the current monitoring tasks unchanged

### Collection Metric

#### Metric set: Monitor Target

|   Metric name   | Metric unit |          Metric help description           |
|-----------------|-------------|--------------------------------------------|
| target          | none        | Discovered service instance target        |
| host            | none        | Service instance host address              |
| port            | none        | Service instance port number               |

### Use Cases

- **Custom Registry**: Integrate with your own service registry system
- **Cloud Platform**: Discover services from cloud platforms (AWS, GCP, Azure)
- **CMDB**: Integrate with CMDB systems to obtain service information
- **Service Gateway**: Discover service instances through API gateway
- **Container Platforms**: Obtain service lists from Kubernetes API or container orchestration platforms
- **Service Management Systems**: Integrate with existing service management platforms
- **Multi-Cloud Environments**: Unify service discovery across different cloud platforms

### Advanced Usage

#### Response with Additional Metadata

While the basic requirement is just the `targets` field, your API can include additional metadata for future extensions:

```json
{
  "targets": [
    "192.168.1.10:8080"
  ],
  "labels": {
    "env": "production",
    "version": "1.0.0"
  }
}
```

Note: Currently, only the `targets` field is used for service discovery, but future versions may support using label information.

### API Implementation Examples

#### Spring Boot Example

```java
@RestController
@RequestMapping("/api/v1")
public class ServiceDiscoveryController {

    @GetMapping("/services")
    public Map<String, Object> getServices() {
        List<String> targets = Arrays.asList(
            "192.168.1.10:8080",
            "192.168.1.11:8080",
            "192.168.1.12:8080"
        );

        Map<String, Object> response = new HashMap<>();
        response.put("targets", targets);
        return response;
    }
}
```

#### Node.js Express Example

```javascript
app.get('/api/services', (req, res) => {
  const targets = [
    '192.168.1.10:8080',
    '192.168.1.11:8080',
    '192.168.1.12:8080'
  ];

  res.json({
    targets: targets
  });
});
```
