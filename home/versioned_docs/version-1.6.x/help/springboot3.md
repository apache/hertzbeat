---
id: springboot3  
Title: Monitoring SpringBoot 3.0      
sidebar_label: SpringBoot 3.0
keywords: [open source monitoring tool, open source monitoring tool, monitoring springboot3 metrics]
---

> Collect and monitor the general performance metrics exposed by the SpringBoot 3.0 actuator.

## Pre-monitoring operations

If you want to monitor information in 'SpringBoot' with this monitoring type, you need to integrate your SpringBoot application and enable the SpringBoot Actuator.

**1、Add POM .XML dependencies:**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

**2. Modify the YML configuration exposure metric interface:**

```yaml
management:
  endpoints:
    web:
      exposure:
        include: '*'
    enabled-by-default: on
```

*Note: If your project also introduces authentication related dependencies, such as springboot security, the interfaces exposed by SpringBoot Actor may be intercepted. In this case, you need to manually release these interfaces. Taking springboot security as an example, you should add the following code to the Security Configuration class:*

```java
public class SecurityConfig extends WebSecurityConfigurerAdapter{
    @Override
    protected void configure(HttpSecurity httpSecurity) throws Exception{
        httpSecurity
                // Configure the interfaces to be released -----------------------------------
                .antMatchers("/actuator/**").permitAll()
                .antMatchers("/metrics/**").permitAll()
                .antMatchers("/trace").permitAll()
                .antMatchers("/heapdump").permitAll()
                // ...
                // For other interfaces, please refer to: https://blog.csdn.net/JHIII/article/details/126601858 -----------------------------------
    }
}
```

### Configuration Parameters

|  Parameter Name   |                                                Parameter Description                                                 |
|-------------------|----------------------------------------------------------------------------------------------------------------------|
| Monitor Host      | The monitored peer's IPV4, IPV6, or domain name. Note⚠️: Do not include protocol headers (eg: https://, http://).    |
| Task Name         | Identifies the name of this monitor, ensuring uniqueness is necessary.                                               |
| Port              | The port provided by the application service, default is 8080.                                                       |
| Enable SSL        | Whether to access the website via HTTPS. Note⚠️: Enabling HTTPS generally requires changing the default port to 443. |
| Collector         | Specifies which collector to use for scheduling data collection for this monitor.                                    |
| Monitoring Period | Interval for periodically collecting data, in seconds, with a minimum interval of 30 seconds.                        |
| Bind Tags         | Tags for categorizing and managing monitored resources.                                                              |
| Description       | Additional identification and description for this monitor, where users can add remarks.                             |

### Collection Metrics

#### Metric Set: Availability

| Metric Name  | Unit | Metric Description |
|--------------|------|--------------------|
| responseTime | ms   | Response time      |

#### Metric Set: Threads

| Metric Name | Unit |        Metric Description        |
|-------------|------|----------------------------------|
| state       | None | Thread state                     |
| size        | None | Number of threads for this state |

#### Metric Set: Memory Usage

| Metric Name | Unit |     Metric Description      |
|-------------|------|-----------------------------|
| space       | None | Memory space name           |
| mem_used    | MB   | Memory usage for this space |

#### Metric Set: Health Status

| Metric Name | Unit |       Metric Description        |
|-------------|------|---------------------------------|
| status      | None | Service health status: UP, Down |
