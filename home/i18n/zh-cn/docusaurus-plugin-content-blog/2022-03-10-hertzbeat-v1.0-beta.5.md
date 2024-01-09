---
title: HertzBeat赫兹节拍 v1.0.beta.5 发布，易用友好的监控告警系统   
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]  
---

HertzBeat赫兹跳动是由Dromara孵化，TanCloud开源的一个支持网站，API，PING，端口，数据库，全站等监控类型，支持阈值告警，告警通知(邮箱，webhook，钉钉，企业微信，飞书机器人)，拥有易用友好的可视化操作界面的开源监控告警项目。

官网:hertzbeat.com | tancloud.cn

此升级版本包含了dashboard仪表盘重新设计，阈值表达式支持多指标，丰富了数据库监控类型，新增mariaDB和postgreSQL数据库的监控，控制台页面新增帮助文档等，欢迎使用。   

版本特性：

1. feature 支持mariadb监控类型 (#11)
2. feature dashboard仪表盘重构 (#13)
3. feature 告警配置支持多指标集合 !10 由 @pengliren 提出 thanks
4. feature 支持postgresql数据库的监控 (#16)
5. 新增监控默认开启探测.
6. 新增mysql采集指标.
7. 新增监控大类别，支持自定义监控页面菜单自动渲染
8. 操作页面新增帮助链接，完善自定义和阈值帮助文档
9. feat: 模拟浏览器设置为chrome浏览器 #Issues 14 由@learning-code 贡献 thanks

BUG修复
1. 登陆改登录，傻傻分不清.
2. 文档新增常见问题，采集器http参数优化校验.
3. 采集器调度第0优先级失败则取消后续的优化.
4. bugfix website monitor path Illegal character in path at index
5. bugfix深色主题适配问题 (#10)
6. fix国际化异常 放开hierarchy接口认证保护

欢迎在线试用 https://console.tancloud.cn


-----------------------

> [HertzBeat赫兹跳动](https://github.com/dromara/hertzbeat) 是由[Dromara](https://dromara.org)孵化，[TanCloud](https://tancloud.cn)开源的一个支持网站，API，PING，端口，数据库等监控类型，拥有易用友好的可视化操作界面的开源监控告警项目。  
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
