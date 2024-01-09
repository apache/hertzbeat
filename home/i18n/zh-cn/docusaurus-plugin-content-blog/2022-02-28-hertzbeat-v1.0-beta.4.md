---
title: HertzBeat赫兹节拍 v1.0.beta.4 发布，易用友好的监控告警系统   
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]  
---

HertzBeat赫兹跳动是由Dromara孵化，TanCloud开源的一个支持网站，API，PING，端口，数据库，全站等监控类型，支持阈值告警，告警通知(邮箱，webhook，钉钉，企业微信，飞书机器人)，拥有易用友好的可视化操作界面的开源监控告警项目。

官网:hertzbeat.com | tancloud.cn

此升级版本包含了大量特性与修复，包括用户急需的账户用户配置，丰富了主流第三方告警通知(企业微信机器人，钉钉机器人，飞书机器人)，更好看的邮件模版，自定义邮件服务器等，欢迎使用。

版本特性：

1. 告警通知：集成飞书官方WebHook实现推送告警信息 #PR9 由 @learning-code 贡献 thanks
2. 告警通知：实现企业微信WebHook告警信息推送 #PR8 由 @learning-code 贡献 thanks
3. 告警通知：告警邮件通知模版优化 由 @learning-code 贡献 thanks
4. 告警通知：集成钉钉群机器人实现推送告警信息
5. 账户：暴露支持YML文件配置登陆用户账户信息
6. 支持自定义邮件服务器
7. 新增帮助中心，监控告警等功能使用过程中的帮助文档. https://tancloud.cn/docs/help/guide
8. DOC其它文档更新，本地启动帮助
9. 新LOGO更新
10. 监控采集间隔时间放开为7天
11. 新增controller接口入参限定修饰符 由 @learning-code 贡献 thanks

BUG修复
1. 监控host参数修复校验.
2. fixBug自定义邮件服务器未生效
3. 邮件页面优化，fix告警级别未转译
4. fix监控删除后告警定义关联未删除
5. 调整jvm启动内存大小,fixOOM
6. fixbug重启后状态异常监控无法触发恢复告警
7. fix pmd error
8. bugfix告警设置确定后异常,按钮还在旋转
9. fix多余租户ID依赖
10. fix receiver的email类型错误，调整弹出框大小
11. fixbug告警定义关联监控不存在时异常

欢迎在线试用 https://console.tancloud.cn

版本升级注意⚠️

1.0-beta2升级上来，MYSQL的数据库需执行。   
ALTER TABLE alert_define_monitor_bind DROP monitor_name;

1.0-beta2,1.0-beta3升级上来，MYSQL的数据库需执行。   
ALTER TABLE notice_receiver ADD access_token varchar(255);

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
