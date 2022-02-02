---
id: custom-subject-creator  
title: 自定义subject creator   
sidebar_label: 自定义subject creator    
---

自定义`subject creator`是我们使用频率最高的扩展，当请求体对象并不是`servlet`或者`jax-rs`标准`api`时，
或者我们从request请求的不同地方获取账户信息时，我们就需要自定义`subject creator`,
使其通过请求对象获取我们需要的请求信息(请求路径，请求方法，认证信息等), 从而创建出对应的`subject`.

sureness已经内置能创建出基于账户密码的PasswordSubject的BasicSubjectServletCreator，
和创建出jwt类型JwtSubject的JwtSubjectServletCreator等，当然我们可以自定义自己需要的subjectCreator来创建subject

自定义前建议了解`sureness`处理流程和提供的扩展接口,详见 [进阶扩展](/docs/advanced/extend-point)

- `SubjectCreate`: 创建`Subject`接口,根据请求内容创建不同类型的`Subject`对象

实现`SubjectCreate`接口方法,根据request请求的内容创建出对应需要的的`subject`

具体扩展实践请参考 [sample-spring-webflux项目集成案例](/docs/integrate/sample-spring-webflux)      