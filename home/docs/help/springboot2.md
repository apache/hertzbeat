---
id: springboot2  
Title: Monitoring SpringBoot 2.0      
sidebar_label: SpringBoot 2.0
keywords: [open source monitoring tool, open source springboot2 monitoring tool, monitoring springboot2 metrics]
---

> Collect and monitor the general performance metrics exposed by the SpringBoot 2.0 actuator.

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
    enabled-by-default: true
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
                // 。。。
                // For other interfaces, please refer to: https://blog.csdn.net/JHIII/article/details/126601858 -----------------------------------
    }
}
```

### Configure parameters

|       Parameter name        |                                                    Parameter Help describes the                                                     |
|-----------------------------|-------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------|
| Monitor Host                | THE MONITORED PEER IPV4, IPV6 OR DOMAIN NAME. Note ⚠️ that there are no protocol headers (eg: https://, http://).                   |
| Monitoring Name             | A name that identifies this monitoring that needs to be unique.                                                                     |
| Port                        | The default port provided by the database is 8080.                                                                                  |
| Enable HTTPS                | Whether to access the website through HTTPS, please note that ⚠️ when HTTPS is enabled, the default port needs to be changed to 443 |
| The acquisition interval is | Monitor the periodic data acquisition interval, in seconds, and the minimum interval that can be set is 30 seconds                  |
| Whether to probe the        | Whether to check the availability of the monitoring before adding a monitoring is successful, and the new modification operation    | will continue only if the probe is successful |
| Description Comment         | For more information identifying and describing the remarks for this monitoring, users can remark the information here              |

### Collect metrics

#### metric Collection: Health

| Metric Name | metric unit |  Metrics help describe   |
|-------------|-------------|--------------------------|
| status      | None        | Service health: UP, Down |

#### metric Collection: enviroment

| Metric Name | metric unit |             Metrics help describe             |
|-------------|-------------|-----------------------------------------------|
| profile     | None        | The application runs profile: prod, dev, test |
| port        | None        | Apply the exposed port                        |
| os          | None        | Run the operating system                      |
| os_arch     | None        | Run the operating system architecture         |
| jdk_vendor  | None        | jdk vendor                                    |
| jvm_version | None        | jvm version                                   |

#### metric Collection: threads

| Metric Name | metric unit |      Metrics help describe       |
|-------------|-------------|----------------------------------|-------------------|
| state       | None        | Thread status                    |
| number      | None        | This thread state corresponds to | number of threads |

#### metric Collection: memory_used

| Metric Name | metric unit |        Metrics help describe         |
|-------------|-------------|--------------------------------------|
| space       | None        | Memory space name                    |
| mem_used    | MB          | This space occupies a memory size of |
