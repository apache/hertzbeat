---
id: sample-spring-webflux  
title: Spring-Webflux项目集成    
sidebar_label: Spring-Webflux项目集成    
---

[spring-webflux-sureness例子项目仓库地址](https://github.com/tomsun28/sureness/tree/master/samples/spring-webflux-sureness)

- 基于`spring-webflux`
- 自定义 `subject creator (BasicSubjectReactiveCreator, JwtSubjectReactiveCreator, NoneSubjectReactiveCreator)` 适配 `ServerHttpRequest` 请求体
- 从默认的配置文件`sureness.yml`加载账户信息,资源角色,过滤资源等信息
- 使用默认的`JWT, Basic Auth`方式认证鉴权
- 例子中包含`REST API`
- 保护入口: `SurenessFilterExample`
- 推荐使用`postman`测试
