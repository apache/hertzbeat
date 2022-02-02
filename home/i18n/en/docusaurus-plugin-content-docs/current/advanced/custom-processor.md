---
id: custom-processor  
title: 自定义processor     
sidebar_label: 自定义processor     
---

processor就是对请求的用户账户信息subject真正的认证鉴权处理器，我们需要实现BaseProcessor接口，来实现我们自定义的认证鉴权方式。  
sureness已经内置基于账户密码认证方式处理PasswordSubject的PasswordProcessor，基于jwt认证方式处理JwtSubject的JwtProcessor等。

自定义前建议了解`sureness`处理流程和提供的扩展接口,详见 [进阶扩展](/docs/advanced/extend-point)

- `Processor`: `Subject`处理接口,根据Subject信息,进行认证鉴权

```
public abstract class BaseProcessor implements Processor{

    public abstract boolean canSupportSubjectClass(Class<?> var);

    public abstract Subject authenticated (Subject var) throws SurenessAuthenticationException;

    public abstract void authorized(Subject var) throws SurenessAuthorizationException;
}

```

上面就是BaseProcessor的一些重要接口方法，自定义processor需要我们去实现这些方法。

- `canSupportSubjectClass` 判断是否支持入参的此Subject类类型，比如 JwtProcessor只支持JwtSubject, PasswordProcessor只支持PasswordSubject
- `authenticated` 对subject进行认证，根据传入的subject信息和系统内信息，进行请求用户的账户认证
- `authorized` 对subject进行鉴权，鉴权判断此用户是否拥有其访问api的访问权限

sureness使用异常流程模型，以上的认证失败或鉴权失败都会抛出不同类型的异常，用户在最外部捕获判断实现接下来的流程。

sureness默认异常类型参考 [默认异常类型](/docs/start/default-exception)    
具体扩展实践请参考 [Springboot项目集成-数据库方案](/docs/integrate/sample-tom)    
