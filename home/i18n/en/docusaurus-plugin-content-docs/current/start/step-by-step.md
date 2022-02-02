---
id: quickstart  
title: 一步一步搭建    
sidebar_label: 一步一步搭建  
---

下面我们来一步一步基于springboot,sureness搭建一个如下功能的认证鉴权系统。  

1. 使用了配置文件来作为系统的账户数据和权限数据的数据源。   
2. 系统基于rbac权限模型，支持basic认证，digest认证，jwt认证。  
3. 能细粒度的控制用户对系统提供的restful api的访问权限，即哪些用户能访问哪些api。  

多说无益，快速开始！  

这里为了照顾到刚入门的同学，图文展示了每一步操作。有基础可直接略过。  

### 初始化一个springboot web工程  

在IDEA如下操作:  

![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c2bc0a723ea74c86a75952cc486367cb~tplv-k3u1fbpfcp-zoom-1.image)

![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/00d3cd3a015b4a079c0b30da064139d0~tplv-k3u1fbpfcp-zoom-1.image)

![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3be963ed9c28493d9ddc3b48caab54af~tplv-k3u1fbpfcp-zoom-1.image)

![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2bcce3d56cb244b6967914a5b9b807c5~tplv-k3u1fbpfcp-zoom-1.image)
 

### 提供一些模拟的restful api  

新建一个controller, 在里面实现一些简单的restful api供外部测试调用  

````
/**
 * simulate api controller, for testing
 * @author tomsun28
 * @date 17:35 2019-05-12
 */
@RestController
public class SimulateController {

    /** access success message **/
    public static final String SUCCESS_ACCESS_RESOURCE = "access this resource success";

    @GetMapping("/api/v1/source1")
    public ResponseEntity<String> api1Mock1() {
        return ResponseEntity.ok(SUCCESS_ACCESS_RESOURCE);
    }

    @PutMapping("/api/v1/source1")
    public ResponseEntity<String> api1Mock3() {
        return ResponseEntity.ok(SUCCESS_ACCESS_RESOURCE);
    }

    @DeleteMapping("/api/v1/source1")
    public ResponseEntity<String> api1Mock4() {
        return ResponseEntity.ok(SUCCESS_ACCESS_RESOURCE);
    }

    @GetMapping("/api/v1/source2")
    public ResponseEntity<String> api1Mock5() {
        return ResponseEntity.ok(SUCCESS_ACCESS_RESOURCE);
    }

    @GetMapping("/api/v1/source2/{var1}/{var2}")
    public ResponseEntity<String> api1Mock6(@PathVariable String var1, @PathVariable Integer var2 ) {
        return ResponseEntity.ok(SUCCESS_ACCESS_RESOURCE);
    }

    @PostMapping("/api/v2/source3/{var1}")
    public ResponseEntity<String> api1Mock7(@PathVariable String var1) {
        return ResponseEntity.ok(SUCCESS_ACCESS_RESOURCE);
    }

    @GetMapping("/api/v1/source3")
    public ResponseEntity<String> api1Mock11(HttpServletRequest request) {
        return ResponseEntity.ok(SUCCESS_ACCESS_RESOURCE);
    }

    @GetMapping("/api/v2/source2")
    public ResponseEntity<String> api1Mock12() {
        return ResponseEntity.ok(SUCCESS_ACCESS_RESOURCE);
    }

}
````

### 项目中加入sureness依赖  

在项目的pom.xml加入sureness的maven依赖坐标    
```
<dependency>
    <groupId>com.usthe.sureness</groupId>
    <artifactId>sureness-core</artifactId>
    <version>1.0.3</version>
</dependency>
```
如下：  

![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1c0df60e4bae4d4b80c0209f461fc8b5~tplv-k3u1fbpfcp-zoom-1.image)


### 使用默认配置来配置sureness    

新建一个配置类，创建对应的sureness默认配置bean  
sureness默认配置使用了文件数据源`sureness.yml`作为账户权限数据源  
默认配置支持了`jwt, basic auth, digest auth`认证  
```
@Configuration
public class SurenessConfiguration {

    /**
     * sureness default config bean
     * @return default config bean
     */
    @Bean
    public DefaultSurenessConfig surenessConfig() {
        return new DefaultSurenessConfig();
    }

}
```

### 配置默认文本配置数据源   

认证鉴权当然也需要我们自己的配置数据:账户数据，角色权限数据等  
这些配置数据可能来自文本，关系数据库，非关系数据库  
我们这里使用默认的文本形式配置 - sureness.yml, 在resource资源目录下创建sureness.yml文件  
在sureness.yml文件里配置我们的角色权限数据和账户数据，如下：  

````
## -- sureness.yml文本数据源 -- ##

# 加载到匹配字典的资源,也就是需要被保护的,设置了所支持角色访问的资源
# 没有配置的资源也默认被认证保护,但不鉴权，例如/api/v1/source2===get
# eg: /api/v1/source1===get===[role2] 表示 /api/v1/source1===get 这条资源支持 role2这一种角色访问
# eg: /api/v2/source2===get===[] 表示 /api/v1/source2===get 这条资源不支持任何角色访问
resourceRole:
  - /api/v1/source1===get===[role2]
  - /api/v1/source1===delete===[role3]
  - /api/v1/source1===put===[role1,role2]
  - /api/v2/source2===get===[]
  - /api/v1/source2/*/*===get===[role2]
  - /api/v2/source3/*===get===[role2]

# 需要被过滤保护的资源,不认证鉴权直接访问
# /api/v1/source3===get 表示 /api/v1/source3===get 可以被任何人访问 无需登录认证鉴权
excludedResource:
  - /api/v1/account/auth===post
  - /api/v1/source3===get
  - /**/*.html===get
  - /**/*.js===get
  - /**/*.css===get
  - /**/*.ico===get

# 用户账户信息
# 下面有 admin root tom三个账户
# eg: admin 拥有[role1,role2]角色,明文密码为admin,加盐密码为0192023A7BBD73250516F069DF18B500
# eg: root 拥有[role1],密码为明文23456
# eg: tom 拥有[role3],密码为明文32113
account:
  - appId: admin
    # 如果填写了加密盐--salt,则credential为MD5(password+salt)的32位结果
    # 没有盐认为不加密,credential为明文
    # 若密码加盐 则digest认证不支持  
    credential: 0192023A7BBD73250516F069DF18B500
    salt: 123
    role: [role1,role2]
  - appId: root
    credential: 23456
    role: [role1]
  - appId: tom
    credential: 32113
    role: [role3]

````

### 添加过滤器拦截所有请求,对所有请求进行认证鉴权      

新建一个filter, 拦截所有请求，用sureness对所有请求进行认证鉴权。认证鉴权失败的请求sureness会抛出对应的异常，我们捕获响应的异常进行处理返回response即可。  

````
@Order(1)
@WebFilter(filterName = "SurenessFilterExample", urlPatterns = "/*", asyncSupported = true)
public class SurenessFilterExample implements Filter {

    @Override
    public void init(FilterConfig filterConfig) {}

    @Override
    public void destroy() {}

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {

        try {
            SubjectSum subject = SurenessSecurityManager.getInstance().checkIn(servletRequest);
            // 认证鉴权成功则会返回带用户信息的subject 可以将subject信息绑定到当前线程上下文holder供后面使用
            if (subject != null) {
                SurenessContextHolder.bindSubject(subject);
            }
        } catch (ProcessorNotFoundException | UnknownAccountException | UnsupportedSubjectException e4) {
            // 账户创建相关异常
            responseWrite(ResponseEntity
                    .status(HttpStatus.BAD_REQUEST).body(e4.getMessage()), servletResponse);
            return;
        } catch (DisabledAccountException | ExcessiveAttemptsException e2 ) {
            // 账户禁用相关异常
            responseWrite(ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED).body(e2.getMessage()), servletResponse);
            return;
        } catch (IncorrectCredentialsException | ExpiredCredentialsException e3) {
            // 认证失败相关异常
            responseWrite(ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED).body(e3.getMessage()), servletResponse);
            return;
        } catch (NeedDigestInfoException e5) {
            // digest认证需要重试异常
            responseWrite(ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .header("WWW-Authenticate", e5.getAuthenticate()).build(), servletResponse);
            return;
        } catch (UnauthorizedException e6) {
            // 鉴权失败相关异常，即无权访问此api
            responseWrite(ResponseEntity
                    .status(HttpStatus.FORBIDDEN).body(e6.getMessage()), servletResponse);
            return;
        } catch (RuntimeException e) {
            // 其他异常
            responseWrite(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build(),
                    servletResponse);
            return;
        }
        try {
            // 若未抛出异常 则认证鉴权成功 继续下面请求流程
            filterChain.doFilter(servletRequest, servletResponse);
        } finally {
            SurenessContextHolder.clear();
        }
    }

    /**
     * write response json data
     * @param content content
     * @param response response
     */
    private static void responseWrite(ResponseEntity content, ServletResponse response) {
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json;charset=utf-8");
        ((HttpServletResponse)response).setStatus(content.getStatusCodeValue());
        content.getHeaders().forEach((key, value) ->
                ((HttpServletResponse) response).addHeader(key, value.get(0)));
        try (PrintWriter printWriter = response.getWriter()) {
            if (content.getBody() != null) {
                if (content.getBody() instanceof String) {
                    printWriter.write(content.getBody().toString());
                } else {
                    ObjectMapper objectMapper = new ObjectMapper();
                    printWriter.write(objectMapper.writeValueAsString(content.getBody()));
                }
            } else {
                printWriter.flush();
            }
        } catch (IOException e) {}
    }
}

````

像上面一样，
1. 若认证鉴权成功,`checkIn`会返回包含用户信息的`SubjectSum`对象  
2. 若中间认证鉴权失败，`checkIn`会抛出不同类型的认证鉴权异常,用户需根据这些异常来继续后面的流程(返回相应的请求响应)

为了使filter在springboot生效 需要在boot启动类加注解 `@ServletComponentScan`   

````
@SpringBootApplication
@ServletComponentScan
public class BootstrapApplication {

    public static void main(String[] args) {
        SpringApplication.run(BootstrapApplication.class, args);
    }
}
````

### 一切完毕，验证测试  

通过上面的步骤 我们的一个完整功能认证鉴权项目就搭建完成了，有同学想 就这几步骤 它的完整功能体现在哪里啊 能支持啥。  

这个搭好的认证鉴权项目基于rbac权限模型，支持 baisc 认证，digest认证, jwt认证。能细粒度的控制用户对后台提供的restful api的访问权限，即哪些用户能访问哪些api。 我们这里来测试一下。 

IDEA上启动工程项目。  

##### basic认证测试  

资源api/v1/source2===get没有配置到文本数据源里，代表所有角色或无角色都可以访问 前提是认证成功，用该资源来做认证测试

**认证成功**：  

![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a09f6caa4ef845adb9f5b5fa6e86040b~tplv-k3u1fbpfcp-zoom-1.image)


**密码错误**：  

![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/caa656a9a9174df6afc8768dc859ecb6~tplv-k3u1fbpfcp-zoom-1.image)
 

**账户不存在**：  

![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/37d8c0d0cd144b4fb8cfd5e0a47e6961~tplv-k3u1fbpfcp-zoom-1.image)
 

##### digest认证测试  

**注意如果密码配置了加密盐，则无法使用digest认证**  

![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/53fe5e08301c4171b31b6180a77b5837~tplv-k3u1fbpfcp-zoom-1.image)

![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c12598db019549efa5f990c0136e7582~tplv-k3u1fbpfcp-zoom-1.image)



##### jwt认证测试  

jwt认证首先你得拥有一个签发的jwt，创建如下api接口提供jwt签发- `/api/v1/account/auth`  
````
@RestController()
public class AccountController {

    private static final String APP_ID = "appId";
    /**
     * account data provider
     */
    private SurenessAccountProvider accountProvider = new DocumentAccountProvider();

    /**
     * login, this provider a get jwt api, convenient to test other api with jwt
     * @param requestBody request
     * @return response
     *
     */
    @PostMapping("/api/v1/account/auth")
    public ResponseEntity<Object> login(@RequestBody Map<String,String> requestBody) {
        if (requestBody == null || !requestBody.containsKey(APP_ID)
                || !requestBody.containsKey("password")) {
            return ResponseEntity.badRequest().build();
        }
        String appId = requestBody.get("appId");
        String password = requestBody.get("password");
        SurenessAccount account = accountProvider.loadAccount(appId);
        if (account == null || account.isDisabledAccount() || account.isExcessiveAttempts()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (account.getPassword() != null) {
            if (account.getSalt() != null) {
                password = Md5Util.md5(password + account.getSalt());
            }
            if (!account.getPassword().equals(password)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        // Get the roles the user has - rbac
        List<String> roles = account.getOwnRoles();
        long refreshPeriodTime = 36000L;
        // issue jwt
        String jwt = JsonWebTokenUtil.issueJwt(UUID.randomUUID().toString(), appId,
                "token-server", refreshPeriodTime >> 1, roles,
                null, Boolean.FALSE);
        Map<String, String> body = Collections.singletonMap("token", jwt);
        return ResponseEntity.ok().body(body);
    }


}
````

**请求api接口登录认证获取jwt**    

![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/3295df4eb54d4deb8498d3ae51aadcb8~tplv-k3u1fbpfcp-zoom-1.image)


**携带使用获取的jwt值请求api接口**    

![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ec0f95fe506946df8b14c8fab5ffd9f2~tplv-k3u1fbpfcp-zoom-1.image)
![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/fb6b8c67ec474e229ba37e62654651d5~tplv-k3u1fbpfcp-zoom-1.image)
 


##### 鉴权测试  

通过上面的sureness.yml文件配置的用户-角色-资源，我们可以关联下面几个典型测试点  
1. `/api/v1/source3===get`资源可以被任何直接访问，不需要认证鉴权  
2. `api/v1/source2===get`资源持所有角色或无角色访问 前提是认证成功  
3. 用户admin能访问`/api/v1/source1===get`资源,而用户root,tom无权限  
4. 用户tom能访`/api/v1/source1===delete`资源，而用户admin.root无权限  
测试如下：  

**`/api/v1/source3===get`资源可以被任何直接访问，不需要认证鉴权**  
![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ae2b3db8d7b64c9abf18c243943f7a4d~tplv-k3u1fbpfcp-zoom-1.image)

**`api/v1/source2===get`资源持所有角色或无角色访问 前提是认证成功**  
![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ace184c86cc5438f91f7614b961dfab1~tplv-k3u1fbpfcp-zoom-1.image)

**用户admin能访问`/api/v1/source1===get`资源,而用户root,tom无权限**  
![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f5fcd36befa84fb59b49c3cc35cb206e~tplv-k3u1fbpfcp-zoom-1.image)
![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/45f9454365ef4a45abc90e436eb0d2f0~tplv-k3u1fbpfcp-zoom-1.image)

**用户tom能访`/api/v1/source1===delete`资源，而用户admin.root无权限**  
![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e9bce40c97dd4aaf9924845922c4917b~tplv-k3u1fbpfcp-zoom-1.image)
![image](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/209598b7717947c585bf479817b24726~tplv-k3u1fbpfcp-zoom-1.image)


### 其他  

这次图文一步一步的详细描述了构建一个简单但完整的认证鉴权项目的流程，当然里面的授权账户等信息是写在配置文件里面的，实际的项目是会把这些数据写在数据库中。
万变不离其宗，无论是写配置文件还是数据库，它只是作为数据源提供数据，基于sureness我们也能轻松快速构建基于数据库的认证鉴权项目，支持动态刷新等各种功能。  

基于数据库方案的项目可参考下方样例->sureness集成springboot样例(数据库方案), 此次一步一步完成的系统源代码也在下方 -> sureness集成springboot样例(配置文件方案)   

<br>    

#### DEMO源代码仓库  

- [x] sureness集成springboot样例(配置文件方案) [sample-bootstrap](https://github.com/tomsun28/sureness/tree/master/sample-bootstrap)      
- [x] sureness集成springboot样例(数据库方案) [sample-tom](https://github.com/tomsun28/sureness/tree/master/sample-tom)    




