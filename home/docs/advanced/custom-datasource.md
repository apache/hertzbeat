---
id: custom-datasource  
title: 自定义数据源   
sidebar_label: 自定义数据源     
---

## 自定义数据源

自定义前建议了解`sureness`处理流程和提供的扩展接口,详见 [进阶扩展](/docs/advanced/extend-point)

- `PathTreeProvider`: 资源的数据源接口,实现从数据库,文本等加载数据,加载到对应的资源权限匹配器`DefaultPathRoleMatcher`中
- `SurenessAccountProvider`: 用户的账户密钥信息接口,实现从数据库,文本等加载数据，加载到需要账户数据的`processor`中


首先我们先来认识下sureness提供的两个用户信息和资源权限信息的接口，用户可以实现这些接口自定义从不同的数据源给sureness提供数据。
当我们把项目从配置文件模式切换成数据库模式时，也只是简单替换了这些接口的实现类而已。

一. `PathTreeProvider` 资源权限配置信息的数据源接口,我们可以实现从数据库,文本等加载接口想要的资源权限配置数据

````
public interface PathTreeProvider {

    Set<String> providePathData();

    Set<String> provideExcludedResource();
}

````  

此接口主要是需要实现上面这两个方法，providePathData是加载资源权限配置信息，也就是我们配置文件模式下sureness.yml的resourceRole信息列，
provideExcludedResource是加载哪些资源可以被过滤不认证鉴权，也就是sureness.yml下的excludedResource信息列，如下。

````
resourceRole:
  - /api/v2/host===post===[role2,role3,role4]
  - /api/v2/host===get===[role2,role3,role4]
  - /api/v2/host===delete===[role2,role3,role4]
  - /api/v2/host===put===[role2,role3,role4]
  - /api/mi/**===put===[role2,role3,role4]
  - /api/v1/getSource1===get===[role1,role2]
  - /api/v2/getSource2/*/*===get===[role2]

excludedResource:
  - /api/v1/source3===get
  - /api/v3/host===get
  - /**/*.css===get
  - /**/*.ico===get
  - /**/*.png===get
````

而当我们使用数据库模式时，实现这些信息从数据库关联读取就ok了，规范返回 eg: /api/v2/host===post===[role2,role3,role4] 格式的数据列，
具体的数据库实现类参考类 - [DatabasePathTreeProvider](https://github.com/tomsun28/sureness/blob/master/sample-tom/src/main/java/com/usthe/sureness/sample/tom/sureness/provider/DatabasePathTreeProvider.java)

二. `SurenessAccountProvider`这第二个相关的接口就是用户的账户密钥信息提供接口,我们需要实现从数据库或者文本等其他数据源那里去加载我们想要的用户的账户信息数据，
这些数据提供需要账户数据的processor进行用户的认证。

````
public interface SurenessAccountProvider {
    SurenessAccount loadAccount(String appId);
}
````
此接口主要需要实现上面这个loadAccount方法，通过用户的唯一标识appid来从数据库或者redis缓存中查找到用户的账户信息返回即可。
用户账户信息类SurenessAccount如下：

````
public class DefaultAccount implements SurenessAccount {

    private String appId;
    private String password;
    private String salt;
    private List<String> ownRoles;
    private boolean disabledAccount;
    private boolean excessiveAttempts;
}
```` 

比较简单，主要是需要提供用户的密码相关信息即可，供sureness认证时密钥判断正确与否。  
这个具体的数据库接口实现可参考类 - [DatabaseAccountProvider](https://github.com/tomsun28/sureness/blob/master/sample-tom/src/main/java/com/usthe/sureness/sample/tom/sureness/provider/DatabaseAccountProvider.java)


具体扩展实践请参考 [Springboot项目集成-数据库方案](/docs/integrate/sample-tom)     
