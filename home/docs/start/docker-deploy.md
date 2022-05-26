---
id: docker-deploy  
title: 通过Docker方式安装HertzBeat    
sidebar_label: Docker方式部署    
---

> 推荐使用docker部署HertzBeat  

安装部署视频教程: [HertzBeat安装部署-BiliBili](https://www.bilibili.com/video/BV1GY41177YL)  

1. 下载安装Docker环境   
   Docker 工具自身的下载请参考 [Docker官网文档](https://docs.docker.com/get-docker/)。
   安装完毕后终端查看Docker版本是否正常输出。
   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```

2. 拉取HertzBeat Docker镜像   
   镜像版本TAG可查看[官方镜像仓库](https://hub.docker.com/r/tancloud/hertzbeat/tags)     
   ``` 
   $ docker pull tancloud/hertzbeat:[版本tag]   
   ```
3. 配置HertzBeat的配置文件  
   在主机目录下创建application.yml，eg:/opt/application.yml   
   配置文件内容参考 项目仓库[/script/application.yml](https://gitee.com/dromara/hertzbeat/raw/master/script/application.yml)，需要替换里面的MYSQL服务和TDengine服务参数，IP端口账户密码（若使用邮件告警，需替换里面的邮件服务器参数）
   具体替换参数如下:
```
   spring.datasource.url
   spring.datasource.username
   spring.datasource.password
   
   warehouse.store.td-engine.url
   warehouse.store.td-engine.username
   warehouse.store.td-engine.password
   
   spring.mail.host
   spring.mail.port
   spring.mail.username
   spring.mail.password
```

4. 配置用户配置文件(非必须,配置账户需要)     
   HertzBeat默认内置三个用户账户,分别为 admin/hertzbeat tom/hertzbeat guest/hertzbeat    
   若需要新增删除修改账户或密码，可以通过配置 `sureness.yml` 实现，若无此需求可忽略此步骤  
   在主机目录下创建sureness.yml，eg:/opt/sureness.yml  
   配置文件内容参考 项目仓库[/script/sureness.yml](https://gitee.com/dromara/hertzbeat/blob/master/script/sureness.yml)
   
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
   
   修改sureness.yml的如下**部分参数**：**[注意⚠️sureness配置的其它默认参数需保留]**  

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

6. 启动HertzBeat Docker容器  
   ``` 
   $ docker run -d -p 1157:1157 -v /opt/application.yml:/opt/hertzbeat/config/application.yml -v /opt/sureness.yml:/opt/hertzbeat/config/sureness.yml --name hertzbeat tancloud/hertzbeat:[版本tag]
   526aa188da767ae94b244226a2b2eec2b5f17dd8eff592893d9ec0cd0f3a1ccd
   ```
   这条命令启动一个运行HertzBeat的Docker容器，并且将容器的1157端口映射到宿主机的1157端口上。若宿主机已有进程占用该端口，则需要修改主机映射端口。
   - docker run -d : 通过Docker运行一个容器,使其在后台运行
   - -p 1157:1157  : 映射容器端口到主机端口
   - -v /opt/application.yml:/opt/hertzbeat/config/application.yml  : 挂载上上一步修改的本地配置文件到容器中，即使用本地配置文件覆盖容器配置文件。我们需要修改此配置文件的MYSQL，TDengine配置信息来连接外部服务。
   - -v /opt/sureness.yml:/opt/hertzbeat/config/sureness.yml  : (非必须)挂载上一步修改的账户配置文件到容器中，若无修改账户需求可删除此命令参数。  
   - --name hertzbeat : 命名容器名称 hertzbeat 
   - tancloud/hertzbeat:[版本tag] : 使用拉取的HertzBeat官方发布的应用镜像来启动容器,TAG可查看[官方镜像仓库](https://hub.docker.com/r/tancloud/hertzbeat/tags)   

7. 开始探索HertzBeat  
   浏览器访问 http://ip:1157/ 开始使用HertzBeat进行监控告警，默认账户密码 admin/hertzbeat。  

**HAVE FUN**   

### Docker部署常见问题   

1. **MYSQL,TDENGINE和HertzBeat都Docker部署在同一主机上，HertzBeat使用localhost或127.0.0.1连接数据库失败**     
此问题本质为Docker容器访问宿主机端口连接失败，由于docker默认网络模式为Bridge模式，其通过localhost访问不到宿主机。
> 解决办法一：配置application.yml将数据库的连接地址由localhost修改为宿主机的对外IP     
> 解决办法二：使用Host网络模式启动Docker，即使Docker容器和宿主机共享网络 `docker run -d --network host .....`   

2. **按照流程部署，访问 http://ip:1157/ 无界面**   
请参考下面几点排查问题：  
> 一：依赖服务MYSQL数据库，TDENGINE数据库是否已按照启动成功，对应hertzbeat数据库是否已创建，SQL脚本是否执行    
> 二：HertzBeat的配置文件 `application.yml` 里面的依赖服务IP账户密码等配置是否正确  
> 三：若都无问题可以 `docker logs hertzbeat` 查看容器日志是否有明显错误，提issue或交流群或社区反馈

3. **日志报错TDengine连接或插入SQL失败**  
> 一：排查配置的数据库账户密码是否正确，数据库是否创建   
> 二：若是安装包安装的TDengine2.3+，除了启动server外，还需执行 `systemctl start taosadapter` 启动 adapter    
