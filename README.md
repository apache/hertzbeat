<p align="center">
  <a href="https://hertzbeat.com">
     <img alt="sureness" src="https://cdn.jsdelivr.net/gh/dromara/hertzbeat/home/static/img/hertzbeat-brand.svg" width="260">
  </a>
</p>

[comment]: <> (<img alt="sureness" src="https://cdn.jsdelivr.net/gh/dromara/hertzbeat/home/static/img/hertzbeat-brand.svg" width="300">)

## HertzBeat 赫兹跳动 | [English Documentation](README_EN.md)           

> 易用友好的云监控系统，无需Agent，强大自定义监控能力。

![tan-cloud](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/web-monitor.svg)
![tan-cloud](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/ping-connect.svg)
![tan-cloud](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/port-available.svg)
![tan-cloud](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/database-monitor.svg)
![tan-cloud](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/os-monitor.svg)
![tan-cloud](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/custom-monitor.svg)
![tan-cloud](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/threshold.svg)
![tan-cloud](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/alert.svg)

**官网: [hertzbeat.com](https://hertzbeat.com) | [tancloud.cn](https://tancloud.cn)**

在开源运行时社区[OSCR.COM](https://osrc.com)快速运行HertzBeat - [部署流程](https://osrc.com/user/articles/wiki_776513931985080320)   

## 🎡 <font color="green">介绍</font>

> [HertzBeat赫兹跳动](https://github.com/dromara/hertzbeat) 是由[Dromara](https://dromara.org)孵化，[TanCloud](https://tancloud.cn)开源的一个支持网站，API，PING，端口，数据库，操作系统等监控类型，拥有易用友好的可视化操作界面的开源监控告警项目。  
> 我们也提供了对应的 **[SAAS版本监控云](https://console.tancloud.cn)**，中小团队和个人无需再为了监控自己的网站资源，而去部署一套繁琐的监控系统，**[登录即可免费开始](https://console.tancloud.cn)**。     
> HertzBeat 支持[自定义监控](https://hertzbeat.com/docs/advanced/extend-point) ,只用通过配置YML文件我们就可以自定义需要的监控类型和指标，来满足常见的个性化需求。   
> HertzBeat 模块化，`manager, collector, warehouse, alerter` 各个模块解耦合，方便理解与定制开发。       
> HertzBeat 支持更自由化的告警配置(计算表达式)，支持告警通知，告警模版，邮件钉钉微信飞书等及时通知送达          
> 欢迎登录 HertzBeat 的 [云环境TanCloud](https://console.tancloud.cn) 试用发现更多。          
> 我们正在快速迭代中，欢迎参与加入一起共建项目开源生态。       

> `HertzBeat`的多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。            

----   

[![tancloud](tancloud.gif)](https://www.bilibili.com/video/BV1DY4y1i7ts)             

----   

## 🥐 模块

- **[manager](https://github.com/dromara/hertzbeat/tree/master/manager)** 提供监控管理,系统管理基础服务
> 提供对监控的管理，监控应用配置的管理，系统用户租户后台管理等。
- **[collector](https://github.com/dromara/hertzbeat/tree/master/collector)** 提供监控数据采集服务
> 使用通用协议远程采集获取对端指标数据。
- **[warehouse](https://github.com/dromara/hertzbeat/tree/master/warehouse)** 提供监控数据仓储服务
> 采集指标结果数据管理，数据落盘，查询，计算统计。
- **[alerter](https://github.com/dromara/hertzbeat/tree/master/alerter)** 提供告警服务
> 告警计算触发，监控状态联动，告警配置，告警通知。
- **[web-app](https://github.com/dromara/hertzbeat/tree/master/web-app)** 提供可视化控制台页面
> 监控告警系统可视化控制台前端  

![hertzBeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/docs/hertzbeat-stru.svg)   


## 🐕 快速开始  

- 如果您不想部署而是直接使用，我们提供SAAS监控云-[TanCloud探云](https://console.tancloud.cn)，即刻 **[登录注册](https://console.tancloud.cn)** 免费使用。
- 如果您是想将HertzBeat部署到内网环境搭建监控系统，请参考下面的 [部署文档](https://hertzbeat.com/docs/start/quickstart) 进行操作。   

安装部署视频教程: [HertzBeat安装部署-BiliBili](https://www.bilibili.com/video/BV1GY41177YL)    

### 🐵 依赖服务部署

> HertzBeat最少依赖于 关系型数据库[MYSQL5+](https://www.mysql.com/) 和 时序性数据库[TDengine2+](https://www.taosdata.com/getting-started)

##### 安装MYSQL
1. docker安装MYSQl  
   `docker run -d --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=123456 mysql:5.7`
2. 创建名称为hertzbeat的数据库
3. 执行位于项目仓库/script/sql/目录下的数据库脚本 [schema.sql](https://gitee.com/dromara/hertzbeat/raw/master/script/sql/schema.sql)

详细步骤参考 [依赖服务MYSQL安装初始化](https://hertzbeat.com/docs/start/mysql-init)    

##### 安装TDengine
1. docker安装TDengine   
   `docker run -d -p 6030-6049:6030-6049 -p 6030-6049:6030-6049/udp --name tdengine tdengine/tdengine:2.4.0.12`
2. 创建名称为hertzbeat的数据库

详细步骤参考 [依赖服务TDengine安装初始化](https://hertzbeat.com/docs/start/tdengine-init)    

### 🍞 HertzBeat安装
> HertzBeat支持通过源码安装启动，Docker容器运行和安装包方式安装部署。

##### 方式一：Docker方式快速安装
`docker run -d -p 1157:1157 -v /opt/application.yml:/opt/hertzbeat/config/application.yml --name hertzbeat tancloud/hertzbeat:[版本tag]`

详细步骤参考 [通过Docker方式安装HertzBeat](https://hertzbeat.com/docs/start/docker-deploy)    

##### 方式二：通过安装包安装
1. 下载您系统环境对应的安装包 [GITEE Release](https://gitee.com/dromara/hertzbeat/releases) [GITHUB Release](https://github.com/dromara/hertzbeat/releases)
2. 配置HertzBeat的配置文件 hertzbeat/config/application.yml
3. 部署启动 `$ ./startup.sh `
4. 浏览器访问 localhost:1157 即可开始，默认账号密码 admin/admin

详细步骤参考 [通过安装包安装HertzBeat](https://hertzbeat.com/docs/start/package-deploy)   

##### 方式三：本地代码启动   
1. 此为前后端分离项目，本地代码调试需要分别启动后端工程manager和前端工程web-app  
2. 后端：需要`maven3+`和`java8+`环境，修改YML配置信息并启动manager服务   
3. 前端：需要`nodejs npm angular-cli`环境，待本地后端启动后，在web-app目录下启动 `ng serve --open`    
4. 浏览器访问 localhost:4200 即可开始，默认账号密码 admin/admin

详细步骤参考 [参与贡献之本地代码启动](CONTRIBUTING.md)      

##### 方式四：Docker-compose统一安装hertzbeat及其依赖服务   

通过 [docker-compose部署脚本](script/docker-compose) 一次性把mysql数据库,tdengine数据库和hertzbeat安装部署。   

详细步骤参考 [docker-compose安装](script/docker-compose/README.md)   

**HAVE FUN**

## 💬 社区交流

HertzBeat赫兹跳动为 [Dromara开源社区](https://dromara.org/) 孵化项目   

##### 微信交流群

加微信号 tan-cloud 或 扫描下面账号二维码拉您进微信群。   
<img alt="tan-cloud" src="https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/docs/help/tan-cloud-wechat.jpg" width="200"/>

##### QQ交流群

加QQ群号 718618151 或 扫描下面的群二维码进群, 验证信息: tancloud

<img alt="tan-cloud" src="https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/docs/help/qq-qr.jpg" width="200"/>          

##### 交流网站

[Dromara社区网站](https://dromara.org/)    
[HertzBeat用户网站](https://support.qq.com/products/379369)   

##### 微信公众号   

<img alt="tan-cloud" src="https://cdn.jsdelivr.net/gh/dromara/hertzbeat/home/static/img/wechat.png" width="400"/>

##### 赞助     

感谢[吉实信息(构建全新的微波+光交易网络)](https://www.flarespeed.com) 赞助服务器采集节点     
感谢[天上云计算(全新智慧上云)](https://www.tsyvps.com/aff/BZBEGYLX) 赞助服务器采集节点     

## 🛡️ License
[`Apache License, Version 2.0`](https://www.apache.org/licenses/LICENSE-2.0.html)
