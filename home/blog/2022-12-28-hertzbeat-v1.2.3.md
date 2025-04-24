---
title: HertzBeat v1.2.3！Support Prometheus,ShenYu and IotDb    
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]
---

## v1.2.3

Home: hertzbeat.com | tancloud.cn

Hi guys! HertzBeat v1.2.3 is coming. This release we support prometheus exporter and more. Now we can collect prometheus exporter metrics using hertzbeat. For this, we support monitor apache shenyu and apache iotdb. Fixed several bugs and improved the overall stable usability.

Let's Try It Now!

Only one docker command is needed to install and experience heartbeat：
`docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`

Thanks to the contributors! 👍👍

We urgently need contributors to test cases, new application monitoring, documentation, etc., and very welcome you to join. Come on! HertzBeat is so easy!

Feature：

1. [[doc] note: startup via source code not required mysql and tdengine env #472](https://github.com/apache/hertzbeat/pull/472) @xingshuaiLi
2. [[doc] fix up:update the environment of hertzbeat to Java version 11 #473](https://github.com/apache/hertzbeat/pull/473) @BKing2020
3. [[docs] update kubernetes.md #478](https://github.com/apache/hertzbeat/pull/478) @wangke6666
4. [[web-app] enable alert define preset true by default #485](https://github.com/apache/hertzbeat/pull/485)
5. [[web-app] support friendly tip when add notice receiver #486](https://github.com/apache/hertzbeat/pull/486)
6. [[web-app] update dashboard category card ui #487](https://github.com/apache/hertzbeat/pull/487)
7. [[collector] limit trigger sub task max num #488](https://github.com/apache/hertzbeat/pull/488)
8. [[script] support service restart shell #489](https://github.com/apache/hertzbeat/pull/489) @zanglikun
9. [[docs] use rainbond deploy hertzbeat #495](https://github.com/apache/hertzbeat/pull/495) @zzzhangqi
10. [[webapp] upgrade web base angular version to 14 #501](https://github.com/apache/hertzbeat/pull/501)
11. [[hertzbeat] support sms alert notice #503](https://github.com/apache/hertzbeat/pull/503)
12. [add Prometheus exporter metrics parser and IoTDB monitor #505](https://github.com/apache/hertzbeat/pull/505) @Ceilzcx
13. [support apache shenyu metrics monitoring #507](https://github.com/apache/hertzbeat/pull/507)

Bugfix.

1. [[manager] fix cross domain problem in SecurityCorsConfiguration #469](https://github.com/apache/hertzbeat/pull/469)  @zenan08
2. [[manager] bugfix linux cpu usage collect incorrect sometime #479](https://github.com/apache/hertzbeat/pull/479) @LWBobo
3. [[collector] fix protocol ssl_cert not support #491](https://github.com/apache/hertzbeat/pull/491)
4. [Update sqlserver.md #493](https://github.com/apache/hertzbeat/pull/493) @SuitSmile
5. [fix: Remove Alert Unused Monitoring IDs #502](https://github.com/apache/hertzbeat/pull/502) @wang1027-wqh
6. [[collector] bugfix npe when ssh collect error #508](https://github.com/apache/hertzbeat/pull/508)
7. [监控k8s问题issue描述与解决方案 #511](https://github.com/apache/hertzbeat/pull/511) @MrAndyMing
8. [[manager] springboot2 monitor support base path config #515](https://github.com/apache/hertzbeat/pull/515)

Online <https://console.tancloud.cn>.

Have Fun!
