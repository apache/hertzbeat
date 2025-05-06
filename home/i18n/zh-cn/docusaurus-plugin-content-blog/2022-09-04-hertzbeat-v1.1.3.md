---
title: 云监控系统 HertzBeat v1.1.3 发布！   
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]
---

Home: hertzbeat.com | tancloud.cn

Hi guys! HertzBeat v1.1.3 is coming. This version supports kafka monitor, ssl certificate expired monitor and more. Fixed several bugs and improved the overall stable usability.

Only one docker command is needed to install and experience hertzbeat：
`docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`

Thanks to the contributors! 👍👍

Feature：

1. [[web-app]feature:update monitors layout, support host copy to clipboard #260](https://github.com/apache/hertzbeat/pull/260)
2. [[monitor] feature: support apache kafka monitor #263](https://github.com/apache/hertzbeat/pull/263) contribute by @wang1027-wqh
3. [[webapp] support history chart query 3 mouth time range #265](https://github.com/apache/hertzbeat/pull/265) issue by @ericfrol
4. [[monitor] support ssl certificate expired monitor #266](https://github.com/apache/hertzbeat/pull/266) suggest by @noear
5. [[web-app] update default interval 600s to 120s #268](https://github.com/apache/hertzbeat/pull/268)
6. [[web-app] update layout ui - help button, nav menu #272](https://github.com/apache/hertzbeat/pull/272)
7. [[alert,webapp] support delete all alerts at once. #273](https://github.com/apache/hertzbeat/pull/273) issue by @ericfrol
8. [[web-app] update home background image #276](https://github.com/apache/hertzbeat/pull/276)

Bugfix.

1. [[docs] fix extend-http-jsonpath.md parseScript error #262](https://github.com/apache/hertzbeat/pull/262) contribute by @woshiniusange    .
2. [[monitor] update help docs, refactor redis metrics name #264](https://github.com/apache/hertzbeat/pull/264)
3. [[manager] bugfix alert tags is null when tags map key normal value null. #270](https://github.com/apache/hertzbeat/pull/270) issue by <https://gitee.com/hello_brother_niu>
4. [[alert] bugfix: the alert global preset config do not take effect #275](https://github.com/apache/hertzbeat/pull/275) issue by <https://gitee.com/hello_brother_niu>

Online <https://console.tancloud.cn>.
