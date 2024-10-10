---
title: Welcome two new Committers from HertzBeat   
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]
---

![HertzBeat](/img/blog/new-committer.png)

## Welcome two new Committers from HertzBeat

> I am very happy that the HertzBeat open source community has welcomed two new community Committers, one is the leader of the R&D team from the front line, and the other is an intern from a large factory. Let us learn about their open source experience!

## The first attacking Ah Chen

Name: Gao Chen

Now engaged in: Fanruan software Java research and development

Hertzbeat Committer

github: gcdd1993 (A Chen who attacked)

### Getting to know Hertzbeat

I started to contact Hertzbeat in April 2022. At that time, the company had a downtime accident, and the website could not be accessed.
I didn’t know until the user feedback. I urgently need a monitoring platform that can monitor the online rate of the website and give timely alarms.
After browsing several monitoring platforms, I finally settled on Hertzbeat, because it has powerful functions, meets the needs and has some surprises.
The most important thing is the code specification, clear comments, and consistent technology stack, which is convenient for the secondary development of enterprises.
Combined with powerful custom notifications, we have monitored databases, middleware, and websites, which have played a vital role in the stable operation of the company's platform.

### Start submitting PRs

The first PR was submitted on April 17, 2022, mainly for the problem of TDEngine time zone error found during the use process. Although it was a simple configuration modification, it also let me know more about HertzBeat, and with the in-depth understanding of the source code, learned a lot.

### Continuous open source contribution and harvest

So far, I have participated in the hertzbeat open source project for more than half a year, contributed a lot, and grown and gained a lot. details as follows:

* Refactored the alarm module based on the strategy mode
* Implemented metric monitoring for `Redis` database
* Optimize `spring.factories` configuration items
* Implemented message notification channels supporting `Telegram`, `Discord`, `Slack`
* Use `Thymeleaf` to restructure the alarm text, and the alarm notification template is more standardized

### Thank you community friends

Thanks to the friends who have helped me or inspired me for free: tomsun28, for every problem encountered during the contribution process, they can patiently guide.

### Advice for newcomers

* HertzBeat's source code is very friendly to novices, with standardized code and rich comments, which is very suitable as a learning project.
* Open source contribution is not achieved overnight, every idea, every question/answer is a contribution, the first step is the most important!

## Next 🌻 Armored Little Treasure

Name: happy deposit

Currently engaged: Junior student of Henan Normal University, internship at Alibaba

Hertz Beat Committer

github: TJxiaobao

### 🌻 Meet hertzbeat for the first time

First of all, I would like to thank Brother Huacheng here, because I wanted to learn some excellent `Java` projects at that time. Then, during the meal, I asked my brother if there was any good project recommendation. At this time, my brother recommended me to Brother Tom. When I personally used `hertzbeat`, I really discovered a new continent. Compared with the simple `Java` project I was exposed to before, I was deeply impressed by the architecture design of `hertzbeat` and its practical functions. me. At this time, a seed of "wanting to contribute my own strength" has been planted in my heart.

### 🌻 Start submitting PR

On Oct 20, 2022, I submitted `PR` for the first time. Although this `PR` is a simple translation comment, it seems that the technical content is not very high.
But he can also make me familiar with the business logic and architecture design of the project faster, and can lay a solid foundation for future contributions.
And this `PR` is also my first step towards open source, and it is also the starting point for me to fall in love with open source!

### 🌻 Continuous open source contribution and harvest

From the first `PR` to the present, I have participated in the `hertzbeat` open source project for a while, and I have also contributed a small part, and I have grown and gained a lot. details as follows.

**contribute:**

1. Realize the monitoring of docker containers.
2. Complete the domestic database DM monitoring
3. Write a single test for the corresponding business.
4. English translation of some annotations.

**reward:**

1. The technical ability has been further improved.
2. Broaden your horizons.
3. Learned a lot from the bosses.

### 🌻 Thanks to the community partners

Thanks to the friends who have helped me or inspired me for free (in no particular order): tomsun28 (brother tom), Huacheng (brother)

### 🌻 A little advice for newcomers

First of all, I am also a newcomer to Novice Village, but I can share some of my experience with you, hoping to help you.

1. Don't be too impatient, and calm down to understand the general implementation logic of each module.
2. Use different functions and debug to see the underlying implementation principle of each function.
3. Slowly try to read the source code and understand it.
4. If you encounter a bug, you can directly report it to issues, or you can try to solve it yourself.

## What is Hertz Beat?

> [HertzBeat Hertz Beat](https://github.com/apache/hertzbeat) is a real-time monitoring and alarm system with powerful custom monitoring capabilities and no Agent required. Monitoring of application services, databases, operating systems, middleware, cloud native, etc., threshold alarms, and alarm notifications (email, WeChat, Dingding, Feishu, SMS, Discord, Slack, Telegram).
>
> We make protocol specifications such as `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` configurable, and you only need to configure YML to use these protocols to customize and collect any metrics you want to collect.  
> Do you believe that you can immediately adapt to a new monitoring type such as K8s or Docker just by configuring YML?
>
> The powerful customization of `HertzBeat`, multi-type support, easy expansion, and low coupling, hope to help developers and small and medium-sized teams quickly build their own monitoring tools.

**Github: <https://github.com/apache/hertzbeat>**
**Gitee: <https://gitee.com/hertzbeat/hertzbeat>**

## ⛄ Supported

* Website Monitoring, Port Availability, Http Api, Ping Connectivity, Jvm, SiteMap, Ssl Certificate, SpringBoot, FTP Server
* Mysql, PostgreSQL, MariaDB, Redis, ElasticSearch, SqlServer, Oracle, MongoDB, Dameng, OpenGauss, ClickHouse, IoTDB
* Linux, Ubuntu, CentOS, Windows
* Tomcat, Nacos, Zookeeper, RabbitMQ, Flink, Kafka, ShenYu, DynamicTp, Jetty, ActiveMQ
  -Kubernetes, Docker
* and more for your custom monitoring.
* Notification support `Discord` `Slack` `Telegram` `Mail` `DingTalk` `WeChat` `Feishu` `SMS` `Webhook`.
