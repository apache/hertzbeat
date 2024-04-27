---
id: account-modify  
title: 配置修改账户密码        
sidebar_label: 配置修改账户密码      
---

HertzBeat默认内置三个用户账户,分别为 admin/hertzbeat tom/hertzbeat guest/hertzbeat        
若需要新增删除修改账户或密码，可以通过配置 `sureness.yml` 实现，若无此需求可忽略此步骤      
修改位于安装目录下的 `/hertzbeat/config/sureness.yml` 的配置文件，docker环境目录为`opt/hertzbeat/config/sureness.yml`，建议提前挂载映射           
配置文件内容参考 项目仓库[/script/sureness.yml](https://github.com/apache/hertzbeat/blob/master/script/sureness.yml)  

```yaml

resourceRole:
   - /api/account/auth/refresh===post===[admin,user,guest]
   - /api/apps/**===get===[admin,user,guest]
   - /api/monitor/**===get===[admin,user,guest]
   - /api/monitor/**===post===[admin,user]
   - /api/monitor/**===put===[admin,user]
   - /api/monitor/**===delete==[admin]
   - /api/monitors/**===get===[admin,user,guest]
   - /api/monitors/**===post===[admin,user]
   - /api/monitors/**===put===[admin,user]
   - /api/monitors/**===delete===[admin]
   - /api/alert/**===get===[admin,user,guest]
   - /api/alert/**===post===[admin,user]
   - /api/alert/**===put===[admin,user]
   - /api/alert/**===delete===[admin]
   - /api/alerts/**===get===[admin,user,guest]
   - /api/alerts/**===post===[admin,user]
   - /api/alerts/**===put===[admin,user]
   - /api/alerts/**===delete===[admin]
   - /api/notice/**===get===[admin,user,guest]
   - /api/notice/**===post===[admin,user]
   - /api/notice/**===put===[admin,user]
   - /api/notice/**===delete===[admin]
   - /api/tag/**===get===[admin,user,guest]
   - /api/tag/**===post===[admin,user]
   - /api/tag/**===put===[admin,user]
   - /api/tag/**===delete===[admin]
   - /api/summary/**===get===[admin,user,guest]
   - /api/summary/**===post===[admin,user]
   - /api/summary/**===put===[admin,user]
   - /api/summary/**===delete===[admin]

# 需要被过滤保护的资源,不认证鉴权直接访问
# /api/v1/source3===get 表示 /api/v1/source3===get 可以被任何人访问 无需登录认证鉴权
excludedResource:
   - /api/account/auth/**===*
   - /api/i18n/**===get
   - /api/apps/hierarchy===get
   # web ui 前端静态资源
   - /===get
   - /dashboard/**===get
   - /monitors/**===get
   - /alert/**===get
   - /account/**===get
   - /setting/**===get
   - /passport/**===get
   - /**/*.html===get
   - /**/*.js===get
   - /**/*.css===get
   - /**/*.ico===get
   - /**/*.ttf===get
   - /**/*.png===get
   - /**/*.gif===get
   - /**/*.jpg===get
   - /**/*.svg===get
   - /**/*.json===get
   # swagger ui 资源
   - /swagger-resources/**===get
   - /v2/api-docs===get
   - /v3/api-docs===get

# 用户账户信息
# 下面有 admin tom lili 三个账户
# eg: admin 拥有[admin,user]角色,密码为hertzbeat 
# eg: tom 拥有[user],密码为hertzbeat
# eg: lili 拥有[guest],明文密码为lili, 加盐密码为1A676730B0C7F54654B0E09184448289
account:
   - appId: admin
     credential: hertzbeat
     role: [admin,user]
   - appId: tom
     credential: hertzbeat
     role: [user]
   - appId: guest
     credential: hertzbeat
     role: [guest]
```

修改`sureness.yml`的如下**部分参数**：**[注意⚠️sureness配置的其它默认参数需保留]**

```yaml

# 用户账户信息
# 下面有 admin tom lili 三个账户
# eg: admin 拥有[admin,user]角色,密码为hertzbeat 
# eg: tom 拥有[user],密码为hertzbeat
# eg: lili 拥有[guest],明文密码为lili, 加盐密码为1A676730B0C7F54654B0E09184448289
account:
   - appId: admin
     credential: hertzbeat
     role: [admin,user]
   - appId: tom
     credential: hertzbeat
     role: [user]
   - appId: guest
     credential: hertzbeat
     role: [guest]
```

## Update Security Secret

> This secret is the key for account security encryption management and needs to be updated to your custom key string of the same length.


Update the `application.yml` file in the `config` directory, modify the `sureness.jwt.secret` parameter to your custom key string of the same length.

```yaml
sureness:
  jwt:
    secret: 'CyaFv0bwq2Eik0jdrKUtsA6bx3sDJeFV643R
             LnfKefTjsIfJLBa2YkhEqEGtcHDTNe4CU6+9
             8tVt4bisXQ13rbN0oxhUZR73M6EByXIO+SV5
             dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp'
```

**重启 HertzBeat 浏览器访问 http://ip:1157/ 即可探索使用 HertzBeat**  
