---
title: 恭喜 HertzBeat 迎来了两位新晋社区Committer   
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]
---

> 非常高兴 HertzBeat 迎来了两位新晋社区Committer, 两位都是来自互联网公司的开发工程师，让我们来了解下他们的开源经历吧！


## 第一位 花城

姓名：王庆华

现从事：阿里巴巴开发工程师

HertzBeat Committer

github：[wang1027-wqh](https://github.com/wang1027-wqh)

## 初识hertzbeat

说起来挺偶然的，结识hertzbeat是因为我大学的毕业设计，当时在一家互联网公司实习，那个时候第一次看到了企业是怎么监控项目的，不管是系统监控、业务监控还是物联网iot监控，那个时候见世面不广，只知道Prometheus + Grafana，但是学起来、用起来成本比较高，那个时候就觉得应该有其他类型的监控，恰好，到了大学毕业设计选题，我就开始寻找这方面的开源项目，那个时候我们小组正在使用Shen Yu网关，我就看了下社区，发现了hertzbeat，自此我便于它结缘了。

## 开始提交PR
到了2022-02-18 我开始提交了我第一个pr，当时只是为了优化一些controller入参的格式，没有什么技术含量，但是这是我接触开源的第一步，让我在从理论学习跨出了实践的一步

## 持续的开源贡献与收获

到目前为止，参与hertzbeat开源项目已有半年多时间，贡献了许多，也成长收获了许多。具体如下：

1.	见证了hertzbeat的贡献值从0到1
2.	兼容了zookeeper、JVM、Kafka等监控功能
3.	实现了hertzbeat项目的国际化
4.	参与了开源之夏并顺利结项
5.	增加了监控系统的基础告警功能: 钉钉、飞书、企业微信、邮箱等


## 感谢社区小伙伴

感谢无偿帮助过我或给过我启发的小伙伴(排名不分先后)：tomsun28，MaxKeyTop，阿超

## 对新人的一点建议

1.	不要觉得自己一上手就能接触到核心，心急吃不了热豆腐
2.	不要只注重看代码，要上手搭建、使用
3.	有想法就大胆尝试，不管自己的方案是否完善
4.	多多关注开源，了解社区动态，多和开源开发者交流


-----
-----

## 第二位 星辰

姓名：郑晨鑫

现从事：某互联网公司Java开发工程师

email：1758619238@qq.com

Hertzbeat Committer

github：[Ceilzcx (zcx) (github.com)](https://github.com/Ceilzcx)


## 初识Hertzbeat

2022年8月开始接触Hertzbeat，由于公司监控elasticsearch使用的cerebro，虽然有非常强大的数据监控，但缺少告警通知的功能；就去github上浏览监控类的项目，刚好看到Hertzbeat，对此非常感兴趣，在了解完整个项目结构和实现后，刚好elasticsearch的监控部分做的不够完善，我就根据cerebro完善了这部分监控数据并提交了pull request。后面在tom老哥的帮助下也开始其他部分的实现。



## 开始提交PR

从2022年9月至今提交了好几个pr，主要包括：

+ Json解析功能的增量，elasticsearch的数据监控增强
+ 实现监控数据添加单位
+ spring.mail改为非必填，优化部分告警阈值的返回处理
+ 实现IoTDB的时序数据库
+ 一些bug的修复。。。
+ promethues exporter 协议解析



## 持续的开源贡献与收获

到目前为止，参与Hertzbeat社区开源已有半年多时间，贡献了许多，也成长收获了许多。

在参与开源的时候会比平常自己做项目想的更多，包括使用第三方软件各个版本如何兼容；实现某个功能也要考虑是否方便以后扩展；要有完善的test模块，减少项目的bug。

同时在社区群里，看到别人提的问题和帮助别人可以学到很多新的知识，很多问题你目前不一定会遇到，其他人遇到的时候你可以思考并收获很多知识。


## 感谢社区小伙伴

感谢无偿帮助过我或给过我启发的小伙伴：[tomsun28](https://github.com/tomsun28)


## 对新人的一点建议

+ 使用者可以先看官网，官网基本能够解决你的问题。部分简单或者常见的问题其他可以自己解决，对自己也是一种锻炼
+ 可以尝试阅读源码，大部分源码都是包含注释的，并不难；不懂的地方也可以通过运行test，debug看一下整个流程
+ 有想法或者bug，可以前往gitee或者github提交issues，也可以在群里询问，不要怕，都是从菜逼过来的


## 如何参与Hertzbeat

+ 官网有非常完善的贡献者指南：[贡献者指南 | HertzBeat](https://hertzbeat.com/docs/others/contributing)

+ Github issues：[Issues · apache/hertzbeat (github.com)](https://github.com/apache/hertzbeat/issues)

+ 如果是大的改动，建议提交前编写issues，在提交pr，同时请注意编码的规范，尽量减少bug和警告的产生


> 以上就是我们新晋Committer们的开源经历了，可以看出参与开源并不难，更重要的是迈出第一步，无论是代码还是文档修复或者提交issue，这些都是贡献者参与开源的姿势。快来加入我们吧！
