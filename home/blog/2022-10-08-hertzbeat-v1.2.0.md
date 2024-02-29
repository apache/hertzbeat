---
title: HertzBeat v1.2.0 发布！易用友好的开源实时监控工具   
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]
---

## v1.2.0

Home: hertzbeat.com | tancloud.cn

Hi guys! HertzBeat v1.2.0 is coming. This version supports more powerful metrics collect jsonpath, upgrade springboot version to 2.7.4, support metrics unit convert display, and more. Fixed several bugs and improved the overall stable usability.

Only one docker command is needed to install and experience heartbeat：
`docker run -d -p 1157:1157 --name hertzbeat tancloud/hertzbeat`

Thanks to the contributors! 👍👍  @Ceilzcx @Privauto @VampireAchao @DreamGirl524 @CharlieXCL @emrys-he @SxLiuYu  @tomsun28

We urgently need contributors to test cases, new application monitoring, documentation, etc., and very welcome you to join. Come on! HertzBeat is so easy!

Feature：

1. [[home,manager]add practice learn doc and hertzbeat monitor yml #284](https://github.com/dromara/hertzbeat/pull/284)
2. [[webapp] auto redirect url when detect browser language #289](https://github.com/dromara/hertzbeat/pull/289) contribute by @DreamGirl524
3. [[home] update logo icon cdn url with fault tolerance #293](https://github.com/dromara/hertzbeat/pull/293) contribute by @VampireAchao
4. [[monitor] enable powerful jsonpath parser, add es metrics #295](https://github.com/dromara/hertzbeat/pull/295) contribute by @Ceilzcx
5.  [[webapp] update ui theme #296](https://github.com/dromara/hertzbeat/pull/296)
6.  [Feature change main pom artifactId #300](https://github.com/dromara/hertzbeat/pull/300) contribute by @Privauto
7.  [[home,webapp] add users logo and update hertzbeat brand #302](https://github.com/dromara/hertzbeat/pull/302)
8. [[monitor] alerter notify test throw msg to front, optional spring.email config #305](https://github.com/dromara/hertzbeat/pull/305) contribute by @Ceilzcx
9. [[home]doc:update docker-deploy.md and tdengine-init.md #306](https://github.com/dromara/hertzbeat/pull/306) contribute by @Privauto
10. [[hertzbeat] refactor common collect metrics data and alert data queue #320](https://github.com/dromara/hertzbeat/pull/320)
11. [[hertzbeat] upgrade springboot version 2.4.13 to 2.7.4 #316](https://github.com/dromara/hertzbeat/pull/316) contribute by @Privauto
12. [[web-app] optimize the monitor detect feedback method #322](https://github.com/dromara/hertzbeat/pull/322)
13. [[github,webapp] add webapp ci action, fix eslint warning and upgrade codeql #323](https://github.com/dromara/hertzbeat/pull/323)
14. [[hertzbeat] add more unit test and test example #324](https://github.com/dromara/hertzbeat/pull/324)
15. [support metrics unit extract, convert and display #326](https://github.com/dromara/hertzbeat/pull/326) contribute by @Ceilzcx
16. [[common] optimize common aviator configuration #327](https://github.com/dromara/hertzbeat/pull/327)

Bugfix.

1. [[webapp,home] fix middle category icon and update home doc #283](https://github.com/dromara/hertzbeat/pull/283)
2. [[web-app] fix redirect when monitors app is null #286](https://github.com/dromara/hertzbeat/pull/286)
3. [[alerter] bugfix aviator expression match npe #297](https://github.com/dromara/hertzbeat/pull/297)
4. [[doc] fix project name error #294](https://github.com/dromara/hertzbeat/pull/294) contribute by @CharlieXCL
5. [[common]feature:use "apache.http.conn.util" replace "sun.net.util" for upgrading java version #299](https://github.com/dromara/hertzbeat/pull/299) contribute by @Privauto
6. [Update docker-deploy.md #304](https://github.com/dromara/hertzbeat/pull/304) contribute by @emrys-he
7. [fix(sec): upgrade snakeyaml to 1.31 #313](https://github.com/dromara/hertzbeat/pull/313) contribute by @SxLiuYu
8. [[script] add startup log and optimize port service judgment #321](https://github.com/dromara/hertzbeat/pull/321)
9. [[web-app] fix echarts y-axis value tip overflow #325](https://github.com/dromara/hertzbeat/pull/325)
10. [[webapp] fix interceptor http resp common error-msg when error #329](https://github.com/dromara/hertzbeat/pull/329)
    Online https://console.tancloud.cn.

Have Fun!

### Upgrade⚠️

Need Convert `application.yml`
```
spring:
  resources:
    static-locations:
      - classpath:/dist/
      - classpath:../dist/
``` 
To
```
spring:
  web:
    resources:
      static-locations:
        - classpath:/dist/
        - classpath:../dist/
```

----     

