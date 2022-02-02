---
id: annotation-datasource  
title: 注解形式的资源权限数据源    
sidebar_label: 注解权限数据源    
---

`sureness`认证鉴权，当然也需要我们提供自己的账户数据，角色权限数据等，这些数据可能来自文本，关系数据库，非关系数据库，注解等。  
我们提供了数据源接口：`SurenessAccountProvider` - 账户数据接口, `PathTreeProvider` - 资源权限数据接口，用户可以实现此接口实现自定义数据源。

`sureness`实现注解权限的方式不是调用方法前aop判断，而是启动时扫描注解里的数据作为权限数据源来使用，这样方便了流程统一和框架无关性。  
这里介绍下注解形式的权限数据源配置方法。

1. 首先我们需要在sureness启动配置中配置使用注解数据源作为权限数据源。

```
@Bean
TreePathRoleMatcher pathRoleMatcher() {
    // 实例化资源权限路径匹配者,其会根据请求的路径和已有的资源权限数据匹配出所需的角色信息
    DefaultPathRoleMatcher pathRoleMatcher = new DefaultPathRoleMatcher();
    // 实例化注解形式的资源权限数据加载者AnnotationLoader，其实现了PathTreeProvider接口
    AnnotationPathTreeProvider pathTreeProvider = new AnnotationPathTreeProvider();
    // 设置AnnotationLoader要扫描的包路径，其会扫描包路径下所有类方法上的@RequiresRoles, @WithoutAuth 注解获取数据
    pathTreeProvider.setScanPackages(Arrays.asList("com.usthe.sureness.sample.tom.controller"));
    // 将AnnotationLoader数据源设置为sureness的权限资源数据源
    pathRoleMatcher.addPathTreeProvider(pathTreeProvider);
    pathRoleMatcher.buildTree();
    return pathRoleMatcher;
}
```

2. 在提供的接口方法中使用注解,注解使用格式:
```
@RequiresRoles(roles = {"role1", "role2"}, mapping = "/resource", method = "post")  
其表示资源 /resource===post 的需要角色 role1或者role2才能访问  
```
```
@WithoutAuth(mapping = "/resource/*", method = "put")  
其表示资源 /resource/*===put 的可以被任何请求访问  
```

3. 建议。  
   注解形式的权限数据源虽然比较方便我们开发，但其写死在代码中，无法动态修改权限角色配置数据，对于大型项目反而不是很适用。  
   `sureness`提供了多个数据源同时加载的功能，即我们可以同时将注解形式的权限数据源和数据库里的配置数据作为数据源，加载到sureness配置中，
   对于不常修改的权限配置，我们可以将其配置到注解，对于其他需要动态修改的权限数据，我们就将其配置到数据库中。


当然也我们提供了默认文本数据源，默认文本数据源具体实现，请参考 [默认文本数据源](/docs/start/default-datasource)       
数据源也可以来自数据库等存储,我们提供了接口让用户轻松的自定义数据源，详见[自定义数据源](/docs/advanced/custom-datasource)  