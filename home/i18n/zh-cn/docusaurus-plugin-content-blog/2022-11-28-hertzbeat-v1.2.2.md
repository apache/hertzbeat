---
title: HertzBeat v1.2.2 发布！新增K8S监控等众多特性   
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
tags: [releases]
description: HertzBeat 1.2.2 新增 Kubernetes、Docker、Spring Boot、Nacos、达梦和 openGauss 监控，并实验性支持 PromQL 采集。
image: /img/blog/covers/hertzbeat-v1-2-2.jpg
---

## V1.2.2

官网: hertzbeat.com | tancloud.cn

大家好，HertzBeat v1.2.2发布啦！这个版本带来个超多重大更新，我们支持了对云原生kubernets, docker的监控，支持了对springboot应用, nacos注册发现中心，达梦数据库，opengauss数据库等的指标监控。我们也引入了一个实验性特性，用户可以使用promethues promql 从promethues server拿取指标数据作为hertzbeat自定义监控指标数据。当然我们也新增了多个测试用户覆盖，修复了多个BUG。还有个很多用户想要的更新，我们新增了对linux监控的top10 cpu 内存利用率的进程监控指标。有个这个指标，我们就可以干很多事情。比如监控某个进程CPU异常，内存爆满啥的。快来试试吧！

只需要一条docker命令即可安装体验heartbeat ：
`docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`

感谢hertzbeat贡献者们的贡献！👍👍

我们急需对测试用例，新增应用监控，文档等各方面的贡献者，非常欢迎您的加入。快来吧，HertzBeat上手非常简单！

Feature：

1. [[manager,collector] support dm database monitor #410](https://github.com/apache/hertzbeat/pull/410) @TJxiaobao
2. [[home] add DM db document supplement #411](https://github.com/apache/hertzbeat/pull/411) @TJxiaobao
3. [[home] support algolia search #416](https://github.com/apache/hertzbeat/pull/416)
4. [[collector] support trigger and grading multiple subtasks through -_- placeholder expression #418](https://github.com/apache/hertzbeat/pull/418)
5. [WIP:feature support k8s monitor, http monitor nacos, service&http_micro monitor msa #421](https://github.com/apache/hertzbeat/pull/421) @cuipiheqiuqiu
6. [[manager] support opengauss database monitor #422](https://github.com/apache/hertzbeat/pull/422)
7. [[#406]\[warehose\] Add unit test MetricsDataControllerTest.java #426](https://github.com/apache/hertzbeat/pull/426) @haibo-duan
8. [[#358]\[manager\] Add unit test manager/service/NoticeConfigServiceTest.java #427](https://github.com/apache/hertzbeat/pull/427) @haibo-duan
9. [[#356]\[manager\] unit test case of manager/service/MailServiceTest.java #432](https://github.com/apache/hertzbeat/pull/432) @csyshu
10. [[manager,collector] support docker metrics monitor #438](https://github.com/apache/hertzbeat/pull/438) @TJxiaobao
11. [[alerter] implement AlertDefineControllerTest unit case #448](https://github.com/apache/hertzbeat/pull/448) @Ceilzcx
12. [[collector] support spi load AbstractCollect Impl instance #449](https://github.com/apache/hertzbeat/pull/449)
13. [[manager] support linux process top10 cpu_usage mem_usage #451](https://github.com/apache/hertzbeat/pull/451)
14. [[hertzbeat] support springboot2.0 metrics monitor #453](https://github.com/apache/hertzbeat/pull/453)
15. [[manager-monitors]（增强）应用服务检测-网站检测-分页：添加默认name升序 （enhancement）manager-… #455](https://github.com/apache/hertzbeat/pull/455) @luxx-lq
16. [[hertzbeat] update use PromQL to collect metrics from promethues server #456](https://github.com/apache/hertzbeat/pull/456)
17. [[manager] support custom monitor api response data code #460](https://github.com/apache/hertzbeat/pull/460)

Bugfix.

1. [【bugfix#408】if logs dir not exist, create logs dir #409](https://github.com/apache/hertzbeat/pull/409) @Ceilzcx
2. [[warehouse] bugfix RealTimeRedisDataStorage wrong extend from #413](https://github.com/apache/hertzbeat/pull/413)
3. [end The query closed the dataSet #414](https://github.com/apache/hertzbeat/pull/414) @Ceilzcx
4. [[alerter] bugfix monitor status not change when alert #415](https://github.com/apache/hertzbeat/pull/415)
5. [[OS Monitor]bugfix:Fix cpu cores and interrupt acquisition under Orac… #424](https://github.com/apache/hertzbeat/pull/424) @assassinfym
6. [[manager] bugfix the gmtUpdate not change when update monitor param #459](https://github.com/apache/hertzbeat/pull/459)
7. [[home] fix typo in springboot2.md #464](https://github.com/apache/hertzbeat/pull/464) @eltociear

----
