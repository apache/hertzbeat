---
title: 裸辞后我做了个开源监控告警系统   
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]  
---

# 裸辞后我做了个开源监控告警系统  

**官网: [hertzbeat.com](https://hertzBeat.com) | [tancloud.cn](https://tancloud.cn)**   
**仓库: [https://github.com/dromara/hertzbeat](https://github.com/dromara/hertzbeat) | [https://gitee.com/dromara/hertzbeat](https://gitee.com/dromara/hertzbeat)**  

大家好，这里自荐一个我全职开发的监控告警项目-HertzBeat赫兹跳动，欢迎大家了解试用。  

毕业后也投入很多业余时间也做了一些开源项目 [Sureness](https://github.com/dromara/sureness) , [Bootshiro](https://gitee.com/tomsun28/bootshiro) , [Issues-translate-action](https://github.com/usthe/issues-translate-action) ,
当时上班有空就回答网友问题，下班回家写开源代码，远程帮人看问题(大年30也看过😂)，还总感觉时间不够用，当时想如果不去上班能做自己热爱的该多好，开源或者技术上能帮助别人感觉是作为程序员的一种成就感吧。        
既然想做开源为啥不能全职去做呢，想着年轻就要折腾，何况还是自己很想做的。于是乎21年底放弃激励裸辞开始全职开源了，也是第一次全职创业(虽然大概率失败，但搏一搏，单车变摩托🤓)       
自己在APM领域做了多年，当然这次创业加开源的方向也就是老本行监控系统，我们开发一个支持多种监控指标(更多监控类型指标正在适配中)，拥有自定义监控，支持阈值告警通知等功能，面向开发者友好的开源监控项目-HertzBeat赫兹跳动。   
为了感谢老婆大人的全力支持，hertzbeat服务端口默认为**1157**(遥遥无期)-老婆叫尧尧，我个人希望未来的宝宝叫午期(没有话语权可能性不大😂)    
想到很多开发者和团队拥有云上资源，可能只需要使用监控服务而并不想部署繁杂的监控系统(往往有时候那套监控系统比我们自身服务消耗的服务器资源还多😅)，我们也提供了可以直接登录使用的SAAS云监控版本-[TanCloud探云](https://console.tancloud.cn)。   
希望老铁们多多支持了解试用点赞，非常感谢。     


### 介绍下HertzBeat      

> HertzBeat赫兹跳动 是一个支持网站，API，PING，端口，全站，数据库等监控类型，拥有易用友好的可视化操作界面的开源监控告警项目。

目前还在开发初期，后面会支持更多的监控类型。数据库，操作系统，云原生，中间件，应用服务等等通用的软件监控都计划安排上。     
在监控领域，监控需求指标啊这些往往千奇百怪，作为一个面向开发者的开源软件，[自定义监控](https://hertzbeat.com/docs/advanced/extend-point) 肯定是要安排上的，大家可以只通过配置YML文件就可以自定义需要的监控类型和指标，来满足常见的个性化需求。   
HertzBeat 也是模块化的，`manager, collector, scheduler, warehouse, alerter` 各个模块解耦合，方便理解上手和定制开发。         
我们也提供了更自由化的告警阈值配置，阈值触发表达式，三种告警级别，触发次数配置，支持告警通知模版，邮件webhook等方式告警通知，实时感知业务状态。              
更多功能欢迎登录 HertzBeat 的 [云环境TanCloud](https://console.tancloud.cn) https://console.tancloud.cn 试用发现。    
项目正在快速迭代中，欢迎参与加入进来我们一起共建项目开源生态。           

**关于HertzBeat的云SAAS环境TanCloud - https://console.tancloud.cn**        

我们很多开发者都会有自己的服务器，博客网站，数据库，云服务等云上资源。对于我们开发者或者中小团队，如何去花最小的精力去监控我们的云上资源，它们挂了或者异常能及时通知给我们进行处理，我感觉是值得探究的。  
如果是去自己部署一套监控系统在服务器上自己用，抛开学习成本和时间成本，往往有时候，那套监控系统比我们的自身网站消耗的服务器资源还大，这让原本紧张的服务器资源就更紧张了。  

对此，我们提供了一个SAAS云监控服务，我们开发者或者中小团队个人无需再为了监控自己的网站等云上资源，而去部署一套繁琐的监控系统。   
[登录即可免费开始使用](https://console.tancloud.cn) https://console.tancloud.cn。目前云环境功能还在快速迭代中，租户，权限等功能都会安排上，欢迎试用提需求提意见。   



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

欢迎老铁们了解使用反馈意见，看到这里不妨给个Star哦，灰常感谢，弯腰！!                 
如果有老哥老妹觉得不错可以投入，欢迎加入进来我们一起搞哦，现在急需懂前端，后台，运维的老哥老妹你了。   
