---
title: HertzBeat入GVP啦，并 v1.0.beta.7 发布，易用友好的实时监控工具     
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]  
---


HertzBeat赫兹跳动 是一个由Dromara孵化的支持网站，API，PING，端口，数据库，全站，操作系统等监控类型，支持阈值告警，告警通知(邮箱，webhook，钉钉，企业微信，飞书机器人)，拥有易用友好的可视化操作界面的开源监控告警项目。

很高兴Hertzbeat被评定为GVP - Gitee最有价值开源项目！


![截屏2022-04-08 09.14.44.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8899bc4e836943dba2ec9efeec4ff629~tplv-k3u1fbpfcp-watermark.image?)

老哥们帮忙在Gitee STAR起来，冲！https://gitee.com/dromara/hertzbeat

官网:hertzbeat.com | tancloud.cn

然后来说说最新的版本，这个版本看这么多feature，其实简单来说主要是这几个

支持了ORACLE数据库的监控，包括ORACLE的基本信息，表空间，连接数，TPS，QPS等指标

支持了LINUX的CPU利用率，内存利用率，磁盘占用相关指标，使LINUX监控贴合实际业务

还有前端参数支持了KEY-VALUE，以后我们就可以在页面上配置HTTP Headers等类似参数了，还有就是参数配置那优化改版，把非常用告警参数隐藏起来了，稍微好看些，然后支持了windows下bat启动脚本，更多的就是稳定性的提升和一些其它的小修复小需求啦！



版本特性：

1. feature 支持oracle数据库监控类型-xgf 由 @gf-8 贡献 thanks
2. feature oracle监控支持tablespace,连接数,qps,tps等指标
3. feature linux监控支持设置超时时间 (#49)
4. feature 检测网站SSL证书是否过期 (#50) 由 @weihongbin 提出 thanks
5. feature 页面配置参数支持KEY-VALUE数组(#57)
6. feature API和网站监控支持页面配置Headers和Params (#58)(#59)
7. feature API和网站监控支持页面配置 basic auth, digest auth (#60)
8. feature http 端口跟随SSL是否启用变更443或80 (#61)
9. feature 修改默认超时时间3000毫秒为6000毫秒 (#55)
10. feature:make tdengine optional, not required (#62)
11. feature:support win bat service (#65)
12. feature:support hide advanced params define (#68)
13. feature:enable auto redirect when 301 302 http code (#69)
14. feature:only collect available metrics when detect (#70)
15. feature:[website api]monitor support keyword match (#72)
16. feature:support linux cpu usage,memory usage,disk free (#76)

BUG修复
1. 添加sqlserver关联文档，fix connection指标入库tdengine失败 (#41)
2. 使用docker部署TDengine，开放tcp访问端口!16 由 @老姜bei 贡献 thanks
3. 补充sureness配置文档 避免误配导致权限异常
4. bugfix:monitors always timeout alert (#67)
5. code format and optimization 由 @学习代码的小白 贡献 thanks
6. bugfix: remove oracle field - database_type due 11g not support 由 @syongaaa 贡献 thanks
7. bugfix:fix linux interface metrics no instance (#75)

欢迎在线试用 https://console.tancloud.cn.

-----------------------

> [HertzBeat赫兹跳动](https://github.com/dromara/hertzbeat) 是一个支持网站，API，PING，端口，数据库，操作系统等监控类型，拥有易用友好的可视化操作界面的开源监控告警项目。  
> 我们也提供了对应的 **[SAAS版本监控云](https://console.tancloud.cn)**，中小团队和个人无需再为了监控自己的网站资源，而去部署一套繁琐的监控系统，**[登录即可免费开始](https://console.tancloud.cn)**。     
> HertzBeat 支持[自定义监控](https://hertzbeat.com/docs/advanced/extend-point) ,只用通过配置YML文件我们就可以自定义需要的监控类型和指标，来满足常见的个性化需求。   
> HertzBeat 模块化，`manager, collector, scheduler, warehouse, alerter` 各个模块解耦合，方便理解与定制开发。       
> HertzBeat 支持更自由化的告警配置(计算表达式)，支持告警通知，告警模版，邮件钉钉微信飞书等及时通知送达          
> 欢迎登录 HertzBeat 的 [云环境TanCloud](https://console.tancloud.cn) 试用发现更多。          
> 我们正在快速迭代中，欢迎参与加入一起共建项目开源生态。

> `HertzBeat`的多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。

老铁们可以通过演示视频来直观了解功能： https://www.bilibili.com/video/BV1DY4y1i7ts

欢迎在线试用 [https://console.tancloud.cn](https://gitee.com/link?target=https%3A%2F%2Fconsole.tancloud.cn)

优化后的参数输入界面:
![输入图片说明](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c4b07908ba5a4b50a094a02dde6a38f3~tplv-k3u1fbpfcp-zoom-1.image "截屏2022-04-07 21.32.52.png")

Linux新增指标:
![输入图片说明](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/92828224f8cd4cac84245aa4217b29e7~tplv-k3u1fbpfcp-zoom-1.image "截屏2022-04-07 17.50.22.png")

ORACLE监控:   
哦豁！oracle环境不在了，之前没有截图，先脑补一张！

**仓库地址**

[Github](https://github.com/dromara/hertzbeat) https://github.com/dromara/hertzbeat      
[Gitee](https://gitee.com/dromara/hertzbeat) https://gitee.com/dromara/hertzbeat

看到这里不妨给个Star支持下哦，灰常感谢，弯腰!!
