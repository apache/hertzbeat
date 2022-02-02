---
id: custom-subject  
title: 自定义subject  
sidebar_label: 自定义subject  
---

subject包含的就是我们request请求所带的用户信息，sureness已经内置基于账户密码的PasswordSubject，
基于jwt的JwtSubject等，当然我们可以自定义自己需要的subject来扩充自己的用户信息

自定义前建议了解`sureness`处理流程和提供的扩展接口,详见 [进阶扩展](/docs/advanced/extend-point)

- `Subject`: 认证鉴权对象接口,提供访问对象的账户密钥,请求资源,角色等信息

自定义subject需要走以下流程：

1. 实现`Subject`接口,添加自定义的`subject`内容
2. 实现`SubjectCreate`接口方法,创建出自定义的`subject` 参考[自定义Subject Creator](/docs/advanced/custom-subject-creator)
3. 实现`Processor`接口,支持处理自定义的`subject` 参考[自定义Processor](/docs/advanced/custom-processor)

具体扩展实践请参考 [使用sureness30分钟项目集成案例](/docs/integrate/sample-tom)     