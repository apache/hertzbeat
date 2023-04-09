---
title: HertzBeat赫兹节拍 v1.0.beta.6 发布，Linux监控来啦   
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]  
---

HertzBeat赫兹跳动是由Dromara孵化，TanCloud开源的一个支持网站，API，PING，端口，数据库，操作系统，全站等监控类型，支持阈值告警，告警通知(邮箱，webhook，钉钉，企业微信，飞书机器人)，拥有易用友好的可视化操作界面的开源监控告警项目。

官网:hertzbeat.com | tancloud.cn

此升级版本包含了很多同学需要的Linux操作系统监控支持，支持其CPU，内存，磁盘，网络等指标，重要的是同步支持了SSH自定义，我们可以很方便的写脚本监控我们想要的Linux指标，也新增了对主流的数据库SqlServer监控支持等，更多功能欢迎使用。     

版本特性：
1. feature 新增支持Linux操作系统监控类型(支持CPU内存磁盘网卡等监控指标) (#20)
2. feature 新增支持microsoft sqlserver数据库监控类型 (#37)
3. feature 添加docker-compose部署方案 (#27) 由 @jx10086 贡献 thanks
4. feature 监控列表支持状态过滤和字段搜索功能 (#29)
5. feature 新增mysql,postgresql等数据库查询超时时间设置 (#18) 由 @学习代码的小白 贡献
6. [纳管]修改为[监控]表述,[探测]修改为[测试]表述
7. feature add github build and translate action (#22)
8. feature 新增贡献指南，本地代码启动文档
9. docs 指定mysql和tdengine版本，避免环境问题

BUG修复
1. fix 由于链接复用不佳造成创建过多链接监控异常 (#26)
2. fix 页面全局监控搜索结果异常 (#28) issue by @Suremotoo
3. 代码优化 #I4U9BT 由 @学习代码的小白 贡献
4. fix 服务启动脚本偶现端口占用误判问题
5. 时间本地时区格式化 (#35)
6. fix 此版本引入问题jdbc解析异常 (#36)
7. fix jdbc并发注册加载时由于spi机制加载死锁问题 (#40)

欢迎在线试用 https://console.tancloud.cn.

-----------------------

> [HertzBeat赫兹跳动](https://github.com/dromara/hertzbeat) 是由[Dromara](https://dromara.org)孵化，[TanCloud](https://tancloud.cn)开源的一个支持网站，API，PING，端口，数据库，操作系统等监控类型，拥有易用友好的可视化操作界面的开源监控告警项目。  
> 我们也提供了对应的 **[SAAS版本监控云](https://console.tancloud.cn)**，中小团队和个人无需再为了监控自己的网站资源，而去部署一套繁琐的监控系统，**[登录即可免费开始](https://console.tancloud.cn)**。     
> HertzBeat 支持[自定义监控](https://hertzbeat.com/docs/advanced/extend-point) ,只用通过配置YML文件我们就可以自定义需要的监控类型和指标，来满足常见的个性化需求。   
> HertzBeat 模块化，`manager, collector, scheduler, warehouse, alerter` 各个模块解耦合，方便理解与定制开发。       
> HertzBeat 支持更自由化的告警配置(计算表达式)，支持告警通知，告警模版，邮件钉钉微信飞书等及时通知送达          
> 欢迎登录 HertzBeat 的 [云环境TanCloud](https://console.tancloud.cn) 试用发现更多。          
> 我们正在快速迭代中，欢迎参与加入一起共建项目开源生态。

> `HertzBeat`的多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。

老铁们可以通过演示视频来直观了解功能： https://www.bilibili.com/video/BV1Vi4y1f7i8

##### 欢迎联系交流哦   

**微信交流群**   

加微信号 tan-cloud 或 扫描下面账号二维码拉进微信群。   
<img alt="tan-cloud" src="https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/docs/help/tan-cloud-wechat.jpg" width="200"/>

**QQ交流群**  

加QQ群号 236915833 或 扫描下面的群二维码进群, 验证信息: tancloud

<img alt="tan-cloud" src="https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/docs/help/qq-qr.jpg" width="200"/>

**仓库地址**      

[Github](https://github.com/dromara/hertzbeat) https://github.com/dromara/hertzbeat      
[Gitee](https://gitee.com/dromara/hertzbeat) https://gitee.com/dromara/hertzbeat    

看到这里不妨给个Star哦，灰常感谢，弯腰!!
