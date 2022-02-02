---
id: default-auth  
title: 默认支持的认证方式         
sidebar_label: 默认认证方式    
---

`sureness`目前默认支持的认证方式有`bearer jwt`,`basic auth`, `digest auth`, 当然用户可以通过扩展`Processor`,`Subject`和`SubjectCreate`接口实现自定义的认证方式

#### `bearer jwt`
`jwt`即`json web token`,是目前很流行的跨域,无状态,安全认证解决方案,介绍详见[网络](http://www.ruanyifeng.com/blog/2018/07/json_web_token-tutorial.html)  
我们这里为啥叫`bearer jwt`是因为`jwt`是放入到http请求头的`bearer token`里面，即:  `Authorization: Bearer jsonWebTokenValue`  
eg:
```
GET /api/v1/source1 HTTP/1.1
Host: localhost:8088
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzUxMiIsInppcCI6IkRFRiJ9.eNocjEEOwiAQRe8y65IwCBQ4hlvjotAhVqs1DBoT492l7F5e_vtfuNYFAliUPs3aCrIuCW1nFDHlUaBVqJOLJpkIA_ArtnHd7o0X5s43egim8qayy6lCQOOUd15JHIA-zy4OUo5dlG2lFp46KDjvR0fKhfgCIU8r0-8PAAD__w.f-3klWWDpEO3uDLlx2S53DV2cYernwVEDwcC6z1JexocbZoxRKmASTOuky1qMCxy_hV8-RbuMjDmI3ASa_FQOw
```  

我们可以在`postman`如下使用它: 将`jwt`值塞入`Bearer Token`里.  
![jwtPostmanUse](/img/docs/jwtPostmanUse.png)

#### `basic auth`
`basic auth`即`Basic access authentication`,经典的`http`基本认证方式,介绍详见[网络](https://www.jianshu.com/p/4cd42f7359f4)    
这种认证方式是将账户密码组成的字符串`base64`加密，放入到请求头的 `Authorization`中, 即：`Authorization: Basic base64encode(username+":"+password)`  
eg:
```
GET /api/v1/source1 HTTP/1.1
Host: localhost:8088
Content-Type: application/json
Authorization: Basic dG9tOjMyMTEz
```  

我们可以在`postman`如下使用它: 在`Basic Auth`类型的`Authorization`中输入账户密码即可,`postman`会自动对其`base64`加密.  
![basicAuthPostmanUse](/img/docs/basicAuthPostmanUse.png)

#### `digest auth`
`digest auth`即`Digest access authentication`,经典的`http`摘要认证方式,用于保护传输的密码，介绍详见[网络](https://www.cnblogs.com/xiaoxiaotank/p/11078571.html)       
下面是`digest auth`的认证流程(图片来源于[网络](https://www.cnblogs.com/xiaoxiaotank/p/11078571.html)):  
![digestFlow](/img/docs/digestFlow.png)

我们可以在`chrome`浏览器直接使用它: 访问`url`，在弹出的对话框中输入账户密码即可,`chrome`浏览器会自动进行认证流程.    
![digestAuthChromeUse](/img/docs/digestAuthUse.png)


#### 其他认证方式
目前`sureness`默认支持这三种主流的认证方式，满足绝大部分需求，当然你也可以很轻松的自定义认证方式，详见[自定义Subject](/docs/advanced/custom-subject)  

我们提供了默认认证方式的使用`DEMO`，请参考 [一步一步搭建认证鉴权系统](/docs/integrate/sample-bootstrap)       
当然我们也提供了自定义认证方式的扩展`DEMO`，请参考 [Springboot项目集成-数据库方案](/docs/integrate/sample-tom)      

