---
title: HertzBeat v1.2.2！Support K8S Monitor And More.     
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]
---

## v1.2.2

Home: hertzbeat.com | tancloud.cn

Hi guys! HertzBeat v1.2.2 is coming. This release brings significant features. This version we support monitor kubernetes, docker, springboot, nacos and database dm, opengauss and more. Also we bring an experimental feature, users can custom define metrics collect from prometheus with promql. Fixed several bugs and improved the overall stable usability. And more, linux monitor we support top10 cpu usage metrics, top10 memory usage metrics.
Let's Try It Now!

Only one docker command is needed to install and experience heartbeat：
`docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`

Thanks to the contributors! 👍👍

We urgently need contributors to test cases, new application monitoring, documentation, etc., and very welcome you to join. Come on! HertzBeat is so easy!

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
16. [[hertzbeat] update use PromQL to collect metrics from prometheus server #456](https://github.com/apache/hertzbeat/pull/456)
17. [[manager] support custom monitor api response data code #460](https://github.com/apache/hertzbeat/pull/460)

Bugfix.

1. [【bugfix#408】if logs dir not exist, create logs dir #409](https://github.com/apache/hertzbeat/pull/409) @Ceilzcx
2. [[warehouse] bugfix RealTimeRedisDataStorage wrong extend from #413](https://github.com/apache/hertzbeat/pull/413)
3. [end The query closed the dataSet #414](https://github.com/apache/hertzbeat/pull/414) @Ceilzcx
4. [[alerter] bugfix monitor status not change when alert #415](https://github.com/apache/hertzbeat/pull/415)
5. [[OS Monitor]bugfix:Fix cpu cores and interrupt acquisition under Orac… #424](https://github.com/apache/hertzbeat/pull/424) @assassinfym
6. [[manager] bugfix the gmtUpdate not change when update monitor param #459](https://github.com/apache/hertzbeat/pull/459)
7. [[home] fix typo in springboot2.md #464](https://github.com/apache/hertzbeat/pull/464) @eltociear

Online <https://console.tancloud.cn>.

Have Fun!
