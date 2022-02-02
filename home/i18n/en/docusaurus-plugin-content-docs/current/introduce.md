---
id: introduce  
title: Sureness 介绍    
sidebar_label: 介绍
slug: /
---

> 面向`REST API`的高性能认证鉴权框架

[![License](https://img.shields.io/badge/license-Apache%202-4EB1BA.svg)](https://www.apache.org/licenses/LICENSE-2.0.html)
[![Maven](https://img.shields.io/badge/Maven%20Central-1.0.6-blue.svg)](https://search.maven.org/artifact/com.usthe.sureness/sureness-core)
![GitHub pull request check contexts](https://img.shields.io/github/status/contexts/pulls/dromara/sureness/8?label=pull%20checks)
[![Gitter](https://img.shields.io/gitter/room/usthe/sureness?label=sureness&color=orange&logo=gitter&logoColor=red)](https://gitter.im/usthe/sureness)
![GitHub Release Date](https://img.shields.io/github/release-date/dromara/sureness?color=blue&logo=figshare&logoColor=red)
[![star](https://gitee.com/dromara/sureness/badge/star.svg?theme=gray)](https://gitee.com/dromara/sureness/stargazers)
[![star](https://img.shields.io/github/stars/dromara/sureness?style=social)](https://github.com/dromara/sureness)


## 📫 背景

在主流的前后端分离架构中，如何通过有效快速的认证鉴权来保护后端提供的`REST API`变得尤为重要。对现存框架，不原生支持`RESTful`的`Apache Shiro`，
还是深度绑定`Spring`的`Spring Security`，或多或少都不是我们的理想型。   
于是乎`Sureness`诞生了，我们希望能解决这些，提供一个面向**REST API**，**无框架依赖**，可以**动态修改权限**，**多认证策略**，**更快速度**，**易用易扩展**的认证鉴权框架。

## 🎡 <font color="green">介绍</font>

> [Sureness](https://github.com/dromara/sureness) 是我们在深度使用 `Apache Shiro` 之后,吸取其优点全新设计开发的一个认证鉴权框架
> 面向 `REST API` 的认证鉴权,基于 `RBAC` (用户-角色-资源)主要关注于对 `API` 的安全保护     
> 无特定Web框架依赖(已有 `Spring Boot,Quarkus,Javalin,Ktor,Micronaut,Jfinal,Solon` 等集成样例)     
> 支持动态修改权限配置(动态修改配置每个 `API` 谁有权访问)   
> 支持 `Websocket` ,主流 `HTTP` 容器 `Servlet` 和 `JAX-RS`       
> 支持多种认证策略, `JWT, Basic Auth, Digest Auth` ... 可扩展自定义认证方式      
> 基于改进的字典匹配树拥有的高性能      
> 良好的扩展接口, 样例和文档助急速理解扩展使用

> `Sureness`的低配置，易扩展，不耦合其他框架，希望能对系统多场景快速安全的保护

##### 🔍 对比

| ~         | Sureness | Shiro | Spring Security |
| ---       | ---      | ---   | ---  |
| **多框架支持**  | 支持      | 需改动支持   | 不支持 |
| **REST API** | 支持 | 需改动支持   | 支持 |
| **Websocket** | 支持 | 不支持   | 不支持 |
| **过滤链匹配**  | 优化的字典匹配树 | ant匹配 | ant匹配 |
| **注解支持**    | 支持      | 支持      | 支持 |
| **Servlet**    | 支持      | 支持      | 支持|
| **JAX-RS**     | 支持      | 不支持    | 不支持|
| **权限动态修改** | 支持 | 需改动支持 | 需改动支持|
| **性能速度** | 较快 | 较慢 | 较慢|
| **学习曲线** | 简单 | 简单 | 陡峭|  

##### 📈 基准性能测试

![benchmark](/img/docs/benchmark_cn.png)

**基准测试显示Sureness对比无权限框架应用损耗0.026ms性能，Shiro损耗0.088ms,Spring Security损耗0.116ms，
相比之下Sureness性能(参考TPS损耗)是Shiro的3倍，Spring Security的4倍**     
**性能差距会随着api匹配链的增加而进一步拉大**     
详见[基准测试](https://github.com/tomsun28/sureness-shiro-spring-security)


##### ✌ 框架支持样例

- [x] Sureness集成**Spring Boot**样例(配置文件方案) [sample-bootstrap](/docs/integrate/sample-bootstrap)
- [x] Sureness集成**Spring Boot**样例(数据库方案) [sample-tom](/docs/integrate/sample-tom)
- [x] Sureness集成**Quarkus**样例 [sample-quarkus](/docs/integrate/sample-quarkus)
- [x] Sureness集成**Javalin**样例 [sample-javalin](/docs/integrate/sample-javalin)
- [x] Sureness集成**Ktor**样例 [sample-ktor](/docs/integrate/sample-ktor)
- [x] Sureness集成**Spring Webflux**样例 [spring-webflux-sureness](/docs/integrate/sample-spring-webflux)
- [x] Sureness集成**Micronaut**样例 [sample-micronaut](/docs/integrate/sample-micronaut)
- [x] Sureness使用Session样例 [sureness-session](https://github.com/usthe/sureness/tree/master/samples/sureness-session)
- [x] Sureness分布式缓存Session样例 [sureness-redis-session](https://github.com/usthe/sureness/tree/master/samples/sureness-redis-session)
- [x] More samples todo   
