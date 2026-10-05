---
id: springboot2
title: 监控：SpringBoot2.0 监控      
sidebar_label: SpringBoot2.0 监控
keywords: [开源监控系统, 开源消息中间件监控, SpringBoot2.0 监控]
---

> 对SpringBoot2.0 actuator 暴露的通用性能指标进行采集监控。

## 监控前操作

如果想要通过此监控类型监控 `SpringBoot` 中的信息，则需要您的SpringBoot应用集成并开启SpringBoot Actuator。

**1、添加POM.XML依赖：**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

**2、修改YML配置暴露指标接口：**

```yaml
management:
  endpoints:
    web:
      exposure:
        include: '*'
    enabled-by-default: on
```

*注意：如果你的项目里还引入了认证相关的依赖，比如springboot-security,那么SpringBoot Actuator暴露出的接口可能会被拦截，此时需要你手动放开这些接口，以springboot-security为例，需要在SecurityConfig配置类中加入以下代码：*

```java
public class SecurityConfig extends WebSecurityConfigurerAdapter{
    @Override
    protected void configure(HttpSecurity httpSecurity) throws Exception{
        httpSecurity
                // 配置要放开的接口 -----------------------------------
                .antMatchers("/actuator/**").permitAll()
                .antMatchers("/metrics/**").permitAll()
                .antMatchers("/trace").permitAll()
                .antMatchers("/heapdump").permitAll()
                // 。。。
                // 其他接口请参考：https://blog.csdn.net/JHIII/article/details/126601858 -----------------------------------
    }
}
```

### 配置参数

|   参数名称    |                        参数帮助描述                        |
|-----------|------------------------------------------------------|
| 监控Host    | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称      | 标识此监控的名称，名称需要保证唯一性。                                  |
| 端口        | 应用服务对外提供的端口，默认为8080。                                 |
| 启用HTTPS   | 是否通过HTTPS访问网站，注意⚠️开启HTTPS一般默认对应端口需要改为443             |
| Base Path | 暴露接口路径前缀，默认 /actuator                                |
| 采集间隔      | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                       |
| 是否探测      | 新增监控前是否先探测检查监控可用性，探测成功才会继续新增修改操作                     |
| 描述备注      | 更多标识和描述此监控的备注信息，用户可以在这里备注信息                          |

### 采集指标

#### 指标集合：health

|  指标名称  | 指标单位 |     指标帮助描述      |
|--------|------|-----------------|
| status | 无    | 服务健康状态: UP,Down |

#### 指标集合：environment

|    指标名称     | 指标单位 |           指标帮助描述           |
|-------------|------|----------------------------|
| profile     | 无    | 应用运行profile: prod,dev,test |
| port        | 无    | 应用暴露端口                     |
| os          | 无    | 运行所在操作系统                   |
| os_arch     | 无    | 运行所在操作系统架构                 |
| jdk_vendor  | 无    | jdk vendor                 |
| jvm_version | 无    | jvm version                |

#### 指标集合：threads

|  指标名称  | 指标单位 |    指标帮助描述    |
|--------|------|--------------|
| state  | 无    | 线程状态         |
| number | 无    | 此线程状态对应的线程数量 |

#### 指标集合：memory_used

|   指标名称   | 指标单位 |  指标帮助描述   |
|----------|------|-----------|
| space    | 无    | 内存空间名称    |
| mem_used | MB   | 此空间占用内存大小 |
