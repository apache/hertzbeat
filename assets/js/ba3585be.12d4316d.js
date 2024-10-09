"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[50946],{15680:(e,t,a)=>{a.d(t,{xA:()=>u,yg:()=>g});var r=a(96540);function l(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function i(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,r)}return a}function p(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?i(Object(a),!0).forEach((function(t){l(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):i(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function n(e,t){if(null==e)return{};var a,r,l=function(e,t){if(null==e)return{};var a,r,l={},i=Object.keys(e);for(r=0;r<i.length;r++)a=i[r],t.indexOf(a)>=0||(l[a]=e[a]);return l}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)a=i[r],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(l[a]=e[a])}return l}var o=r.createContext({}),h=function(e){var t=r.useContext(o),a=t;return e&&(a="function"==typeof e?e(t):p(p({},t),e)),a},u=function(e){var t=h(e.components);return r.createElement(o.Provider,{value:t},e.children)},m={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},c=r.forwardRef((function(e,t){var a=e.components,l=e.mdxType,i=e.originalType,o=e.parentName,u=n(e,["components","mdxType","originalType","parentName"]),c=h(a),g=l,s=c["".concat(o,".").concat(g)]||c[g]||m[g]||i;return a?r.createElement(s,p(p({ref:t},u),{},{components:a})):r.createElement(s,p({ref:t},u))}));function g(e,t){var a=arguments,l=t&&t.mdxType;if("string"==typeof e||l){var i=a.length,p=new Array(i);p[0]=c;var n={};for(var o in t)hasOwnProperty.call(t,o)&&(n[o]=t[o]);n.originalType=e,n.mdxType="string"==typeof e?e:l,p[1]=n;for(var h=2;h<i;h++)p[h]=a[h];return r.createElement.apply(null,p)}return r.createElement.apply(null,a)}c.displayName="MDXCreateElement"},28647:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>o,contentTitle:()=>p,default:()=>m,frontMatter:()=>i,metadata:()=>n,toc:()=>h});var r=a(58168),l=(a(96540),a(15680));const i={title:"HertzBeat v1.4.4 released now!",author:"tom",author_title:"tom",author_url:"https://github.com/tomsun28",author_image_url:"https://avatars.githubusercontent.com/u/24788200?s=400&v=4",tags:["opensource","practice"],keywords:["open source monitoring system","alerting system"]},p=void 0,n={permalink:"/blog/2024/01/18/hertzbeat-v1.4.4",editUrl:"https://github.com/apache/hertzbeat/edit/master/home/blog/2024-01-18-hertzbeat-v1.4.4.md",source:"@site/blog/2024-01-18-hertzbeat-v1.4.4.md",title:"HertzBeat v1.4.4 released now!",description:"What is HertzBeat?",date:"2024-01-18T00:00:00.000Z",formattedDate:"January 18, 2024",tags:[{label:"opensource",permalink:"/blog/tags/opensource"},{label:"practice",permalink:"/blog/tags/practice"}],readingTime:6.525,hasTruncateMarker:!1,authors:[{name:"tom",title:"tom",url:"https://github.com/tomsun28",imageURL:"https://avatars.githubusercontent.com/u/24788200?s=400&v=4"}],frontMatter:{title:"HertzBeat v1.4.4 released now!",author:"tom",author_title:"tom",author_url:"https://github.com/tomsun28",author_image_url:"https://avatars.githubusercontent.com/u/24788200?s=400&v=4",tags:["opensource","practice"],keywords:["open source monitoring system","alerting system"]},prevItem:{title:"The open-source real-time monitoring HertzBeat is donated to the Apache Incubator.",permalink:"/blog/2024/04/17/to-apache"},nextItem:{title:"Welcome to HertzBeat Community Committer!",permalink:"/blog/2024/01/11/new-committer"}},o={authorsImageUrls:[void 0]},h=[{value:"What is HertzBeat?",id:"what-is-hertzbeat",level:3},{value:"Features",id:"features",level:3},{value:"HertzBeat&#39;s 1.4.4 Version Release",id:"hertzbeats-144-version-release",level:3},{value:"Install Quickly Via Docker",id:"install-quickly-via-docker",level:3},{value:"What&#39;s Changed",id:"whats-changed",level:3},{value:"1397 feature: support for dns monitoring by @Calvin979 in https://github.com/apache/hertzbeat/pull/1416",id:"1397-feature-support-for-dns-monitoring-by-calvin979-in-httpsgithubcomapachehertzbeatpull1416",level:2},{value:"New Contributors",id:"new-contributors",level:2},{value:"\u26c4 Supported",id:"-supported",level:2},{value:"<strong>Download Link</strong>",id:"download-link",level:3}],u={toc:h};function m(e){let{components:t,...i}=e;return(0,l.yg)("wrapper",(0,r.A)({},u,i,{components:t,mdxType:"MDXLayout"}),(0,l.yg)("h3",{id:"what-is-hertzbeat"},"What is HertzBeat?"),(0,l.yg)("p",null,(0,l.yg)("a",{parentName:"p",href:"https://github.com/apache/hertzbeat"},"HertzBeat")," is an open source, real-time monitoring system with custom monitoring, high performance cluster, prometheus-compatible and agentless capabilities."),(0,l.yg)("h3",{id:"features"},"Features"),(0,l.yg)("ul",null,(0,l.yg)("li",{parentName:"ul"},"Combines ",(0,l.yg)("strong",{parentName:"li"},"monitoring, alarm, and notification")," features into one platform, and supports monitoring for web service, program, database, cache, os, webserver, middleware, bigdata, cloud-native, network, custom and more."),(0,l.yg)("li",{parentName:"ul"},"Easy to use and agentless, web-based and with one-click monitoring and alerting, zero learning curve."),(0,l.yg)("li",{parentName:"ul"},"Makes protocols such as ",(0,l.yg)("inlineCode",{parentName:"li"},"Http, Jmx, Ssh, Snmp, Jdbc, Prometheus")," configurable, allowing you to collect any metrics by simply configuring the template ",(0,l.yg)("inlineCode",{parentName:"li"},"YML")," file online. Imagine being able to quickly adapt to a new monitoring type like K8s or Docker simply by configuring online with HertzBeat."),(0,l.yg)("li",{parentName:"ul"},"Compatible with the ",(0,l.yg)("inlineCode",{parentName:"li"},"Prometheus")," ecosystem and more, can monitoring what ",(0,l.yg)("inlineCode",{parentName:"li"},"Prometheus")," can monitoring with few clicks on webui."),(0,l.yg)("li",{parentName:"ul"},"High performance, supports horizontal expansion of multi-collector clusters, multi-isolated network monitoring and cloud-edge collaboration."),(0,l.yg)("li",{parentName:"ul"},"Provides flexible alarm threshold rules and timely notifications delivered via  ",(0,l.yg)("inlineCode",{parentName:"li"},"Discord")," ",(0,l.yg)("inlineCode",{parentName:"li"},"Slack")," ",(0,l.yg)("inlineCode",{parentName:"li"},"Telegram")," ",(0,l.yg)("inlineCode",{parentName:"li"},"Email")," ",(0,l.yg)("inlineCode",{parentName:"li"},"Dingtalk")," ",(0,l.yg)("inlineCode",{parentName:"li"},"WeChat")," ",(0,l.yg)("inlineCode",{parentName:"li"},"FeiShu")," ",(0,l.yg)("inlineCode",{parentName:"li"},"Webhook")," ",(0,l.yg)("inlineCode",{parentName:"li"},"SMS")," ",(0,l.yg)("inlineCode",{parentName:"li"},"ServerChan"),".")),(0,l.yg)("blockquote",null,(0,l.yg)("p",{parentName:"blockquote"},"HertzBeat's powerful customization, multi-type support, high performance, easy expansion, and low coupling, aims to help developers and teams quickly build their own monitoring system.")),(0,l.yg)("p",null,(0,l.yg)("img",{alt:"HertzBeat",src:a(72428).A,width:"2814",height:"1772"})),(0,l.yg)("p",null,(0,l.yg)("strong",{parentName:"p"},"Github: ",(0,l.yg)("a",{parentName:"strong",href:"https://github.com/apache/hertzbeat"},"https://github.com/apache/hertzbeat"))),(0,l.yg)("p",null,(0,l.yg)("strong",{parentName:"p"},"Gitee: ",(0,l.yg)("a",{parentName:"strong",href:"https://gitee.com/hertzbeat/hertzbeat"},"https://gitee.com/hertzbeat/hertzbeat"))),(0,l.yg)("h3",{id:"hertzbeats-144-version-release"},"HertzBeat's 1.4.4 Version Release"),(0,l.yg)("ul",null,(0,l.yg)("li",{parentName:"ul"},"support snmp v3 monitoring protocol @TJxiaobao"),(0,l.yg)("li",{parentName:"ul"},"support monitoring NebulaGraph metrics @ZY945"),(0,l.yg)("li",{parentName:"ul"},"support monitoring pop3 metrics @a-little-fool"),(0,l.yg)("li",{parentName:"ul"},"support monitoring memcached metrics @ZY945"),(0,l.yg)("li",{parentName:"ul"},"support monitoring nginx metrics @a-little-fool"),(0,l.yg)("li",{parentName:"ul"},"support monitoring hive metrics  @a-little-fool"),(0,l.yg)("li",{parentName:"ul"},"feature: support for dns monitoring by @Calvin979"),(0,l.yg)("li",{parentName:"ul"},"monitoring the availability of websockets through handshake. by @ZY945"),(0,l.yg)("li",{parentName:"ul"},"add ntp protocol and support ntp monitoring by @ZY945"),(0,l.yg)("li",{parentName:"ul"},"add smtp protocol and support smtp monitoring by @ZY945"),(0,l.yg)("li",{parentName:"ul"},"more feature, document and bugfix")),(0,l.yg)("h3",{id:"install-quickly-via-docker"},"Install Quickly Via Docker"),(0,l.yg)("ol",null,(0,l.yg)("li",{parentName:"ol"},(0,l.yg)("p",{parentName:"li"},"Just one command to get started:"),(0,l.yg)("p",{parentName:"li"},(0,l.yg)("inlineCode",{parentName:"p"},"docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat")),(0,l.yg)("p",{parentName:"li"},(0,l.yg)("inlineCode",{parentName:"p"},"or use quay.io (if dockerhub network connect timeout)")),(0,l.yg)("p",{parentName:"li"},(0,l.yg)("inlineCode",{parentName:"p"},"docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat quay.io/tancloud/hertzbeat"))),(0,l.yg)("li",{parentName:"ol"},(0,l.yg)("p",{parentName:"li"},"Access ",(0,l.yg)("inlineCode",{parentName:"p"},"http://localhost:1157")," to start, default account: ",(0,l.yg)("inlineCode",{parentName:"p"},"admin/hertzbeat"))),(0,l.yg)("li",{parentName:"ol"},(0,l.yg)("p",{parentName:"li"},"Deploy collector clusters"),(0,l.yg)("pre",{parentName:"li"},(0,l.yg)("code",{parentName:"pre",className:"language-shell"},"docker run -d -e IDENTITY=custom-collector-name -e MANAGER_HOST=127.0.0.1 -e MANAGER_PORT=1158 --name hertzbeat-collector apache/hertzbeat-collector\n")),(0,l.yg)("ul",{parentName:"li"},(0,l.yg)("li",{parentName:"ul"},(0,l.yg)("inlineCode",{parentName:"li"},"-e IDENTITY=custom-collector-name")," : set the collector unique identity name."),(0,l.yg)("li",{parentName:"ul"},(0,l.yg)("inlineCode",{parentName:"li"},"-e MANAGER_HOST=127.0.0.1")," : set the main hertzbeat server ip."),(0,l.yg)("li",{parentName:"ul"},(0,l.yg)("inlineCode",{parentName:"li"},"-e MANAGER_PORT=1158")," : set the main hertzbeat server port, default 1158.")))),(0,l.yg)("p",null,"Detailed config refer to ",(0,l.yg)("a",{parentName:"p",href:"https://hertzbeat.com/docs/start/docker-deploy"},"Install HertzBeat via Docker")),(0,l.yg)("hr",null),(0,l.yg)("h3",{id:"whats-changed"},"What's Changed"),(0,l.yg)("blockquote",null,(0,l.yg)("p",{parentName:"blockquote"},"Welcome to explore more new version updates, thanks to the hard work of the community partners, love \ud83d\udc97!")),(0,l.yg)("ul",null,(0,l.yg)("li",{parentName:"ul"},"bugfix metrics tags value store jpa data-storage error by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1403"},"https://github.com/apache/hertzbeat/pull/1403")),(0,l.yg)("li",{parentName:"ul"},"add smtp protocol and support smtp monitoring by @ZY945 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1407"},"https://github.com/apache/hertzbeat/pull/1407")),(0,l.yg)("li",{parentName:"ul"},"add ZY945 as a contributor for code by @allcontributors in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1409"},"https://github.com/apache/hertzbeat/pull/1409")),(0,l.yg)("li",{parentName:"ul"},"support new parse type 'log' in ssh collect protocol by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1410"},"https://github.com/apache/hertzbeat/pull/1410")),(0,l.yg)("li",{parentName:"ul"},"add ntp protocol and support ntp monitoring by @ZY945 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1411"},"https://github.com/apache/hertzbeat/pull/1411")),(0,l.yg)("li",{parentName:"ul"},"monitoring the availability of websockets through handshake. by @ZY945 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1413"},"https://github.com/apache/hertzbeat/pull/1413")),(0,l.yg)("li",{parentName:"ul"},"[Task-1386]"," When adding tags in tag management, random colors are given by default. by @prolevel1 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1412"},"https://github.com/apache/hertzbeat/pull/1412")),(0,l.yg)("li",{parentName:"ul"},"add prolevel1 as a contributor for code by @allcontributors in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1415"},"https://github.com/apache/hertzbeat/pull/1415")),(0,l.yg)("li",{parentName:"ul"})),(0,l.yg)("h2",{id:"1397-feature-support-for-dns-monitoring-by-calvin979-in-httpsgithubcomapachehertzbeatpull1416"},"1397 feature: support for dns monitoring by @Calvin979 in ",(0,l.yg)("a",{parentName:"h2",href:"https://github.com/apache/hertzbeat/pull/1416"},"https://github.com/apache/hertzbeat/pull/1416")),(0,l.yg)("ul",null,(0,l.yg)("li",{parentName:"ul"},"Support monitoring hive metrics by @a-little-fool in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1417"},"https://github.com/apache/hertzbeat/pull/1417")),(0,l.yg)("li",{parentName:"ul"},"support legend pageable in history data charts by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1414"},"https://github.com/apache/hertzbeat/pull/1414")),(0,l.yg)("li",{parentName:"ul"},"update component tip and help tip doc by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1418"},"https://github.com/apache/hertzbeat/pull/1418")),(0,l.yg)("li",{parentName:"ul"},"feature: support monitoring nginx metrics and add a help doc by @a-little-fool in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1420"},"https://github.com/apache/hertzbeat/pull/1420")),(0,l.yg)("li",{parentName:"ul"},"update parser to parse from prometheus txt metrics data by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1421"},"https://github.com/apache/hertzbeat/pull/1421")),(0,l.yg)("li",{parentName:"ul"},"support monitoring memcached metrics and add a help doc by @ZY945 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1423"},"https://github.com/apache/hertzbeat/pull/1423")),(0,l.yg)("li",{parentName:"ul"},"support all ssh connect key exchange by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1424"},"https://github.com/apache/hertzbeat/pull/1424")),(0,l.yg)("li",{parentName:"ul"},"[doc]"," add code of conduct by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1425"},"https://github.com/apache/hertzbeat/pull/1425")),(0,l.yg)("li",{parentName:"ul"},"update label structure store in victoria metrics, make it prometheus like by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1426"},"https://github.com/apache/hertzbeat/pull/1426")),(0,l.yg)("li",{parentName:"ul"},"feature: support monitoring pop3 metrics and add help doc by @a-little-fool in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1427"},"https://github.com/apache/hertzbeat/pull/1427")),(0,l.yg)("li",{parentName:"ul"},"Update sidebars.json by @a-little-fool in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1428"},"https://github.com/apache/hertzbeat/pull/1428")),(0,l.yg)("li",{parentName:"ul"},"Add zh-cn help doc by @a-little-fool in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1429"},"https://github.com/apache/hertzbeat/pull/1429")),(0,l.yg)("li",{parentName:"ul"},"update monitoring state un-manage to unmonitored, update pic by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1430"},"https://github.com/apache/hertzbeat/pull/1430")),(0,l.yg)("li",{parentName:"ul"},"Add jpa to date type storage by @Clownsw in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1431"},"https://github.com/apache/hertzbeat/pull/1431")),(0,l.yg)("li",{parentName:"ul"},"bugfix ^o^ token error, protect metrics api auth by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1434"},"https://github.com/apache/hertzbeat/pull/1434")),(0,l.yg)("li",{parentName:"ul"},"Add relevant documents for SMTP and NTP by @ZY945 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1437"},"https://github.com/apache/hertzbeat/pull/1437")),(0,l.yg)("li",{parentName:"ul"},"bugfix threshold init error in mysql env by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1435"},"https://github.com/apache/hertzbeat/pull/1435")),(0,l.yg)("li",{parentName:"ul"},"app-rabbitmq.yml support for international name aliases by @ZY945 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1439"},"https://github.com/apache/hertzbeat/pull/1439")),(0,l.yg)("li",{parentName:"ul"},"fix(*): error create lru-cache-timeout-cleaner thread by @Clownsw in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1438"},"https://github.com/apache/hertzbeat/pull/1438")),(0,l.yg)("li",{parentName:"ul"},"app-rabbitmq.yml Modifying Error Fields. by @ZY945 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1440"},"https://github.com/apache/hertzbeat/pull/1440")),(0,l.yg)("li",{parentName:"ul"},"support monitoring NebulaGraph metrics and add help doc by @ZY945 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1441"},"https://github.com/apache/hertzbeat/pull/1441")),(0,l.yg)("li",{parentName:"ul"},"Fix Nginx Collect validateParams function NPE by @Clownsw in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1442"},"https://github.com/apache/hertzbeat/pull/1442")),(0,l.yg)("li",{parentName:"ul"},"feature: add metrics i18n for app-springboot3.yml by @liyin in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1445"},"https://github.com/apache/hertzbeat/pull/1445")),(0,l.yg)("li",{parentName:"ul"},"feat: add metrics i18n for app-docker.yml by @liyin in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1446"},"https://github.com/apache/hertzbeat/pull/1446")),(0,l.yg)("li",{parentName:"ul"},"update docker-compose script and fix version by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1447"},"https://github.com/apache/hertzbeat/pull/1447")),(0,l.yg)("li",{parentName:"ul"},"bugfix java.lang.IllegalArgumentException: Illegal character in query\u2026 by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1443"},"https://github.com/apache/hertzbeat/pull/1443")),(0,l.yg)("li",{parentName:"ul"},"bugfix delete monitor error after monitor canceled by @ZhangZixuan1994 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1451"},"https://github.com/apache/hertzbeat/pull/1451")),(0,l.yg)("li",{parentName:"ul"},"add ZhangZixuan1994 as a contributor for code by @allcontributors in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1454"},"https://github.com/apache/hertzbeat/pull/1454")),(0,l.yg)("li",{parentName:"ul"},"remove sleep, probably busy-waiting by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1456"},"https://github.com/apache/hertzbeat/pull/1456")),(0,l.yg)("li",{parentName:"ul"},"[doc]"," add new committer ZY945 by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1453"},"https://github.com/apache/hertzbeat/pull/1453")),(0,l.yg)("li",{parentName:"ul"},"Update app-zookeeper.yml by @hurenjie1 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1458"},"https://github.com/apache/hertzbeat/pull/1458")),(0,l.yg)("li",{parentName:"ul"},"add hurenjie1 as a contributor for code by @allcontributors in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1459"},"https://github.com/apache/hertzbeat/pull/1459")),(0,l.yg)("li",{parentName:"ul"},"update dashboard ui, remove ssh custom SignatureFactories, update app name by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1460"},"https://github.com/apache/hertzbeat/pull/1460")),(0,l.yg)("li",{parentName:"ul"},"[Task]"," Monitoring Template Yml Metrics I18n | \u76d1\u63a7\u6a21\u7248\u6307\u6807\u56fd\u9645\u5316\u4efb\u52a1\u8ba4\u9886 #1212 by @tslj1024 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1461"},"https://github.com/apache/hertzbeat/pull/1461")),(0,l.yg)("li",{parentName:"ul"},"add tslj1024 as a contributor for code by @allcontributors in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1462"},"https://github.com/apache/hertzbeat/pull/1462")),(0,l.yg)("li",{parentName:"ul"},"Add alarm trigger time for alarm restore by @Calvin979 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1464"},"https://github.com/apache/hertzbeat/pull/1464")),(0,l.yg)("li",{parentName:"ul"},"bugfix history range query not work when victoria-metrics store by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1463"},"https://github.com/apache/hertzbeat/pull/1463")),(0,l.yg)("li",{parentName:"ul"},"bugfix springboot3 translation by @liyin in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1467"},"https://github.com/apache/hertzbeat/pull/1467")),(0,l.yg)("li",{parentName:"ul"},"bugfix telegram-notice can not input bot-token by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1465"},"https://github.com/apache/hertzbeat/pull/1465")),(0,l.yg)("li",{parentName:"ul"},"feat: support hostname target by @ldysdu in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1455"},"https://github.com/apache/hertzbeat/pull/1455")),(0,l.yg)("li",{parentName:"ul"},"add ldysdu as a contributor for code by @allcontributors in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1471"},"https://github.com/apache/hertzbeat/pull/1471")),(0,l.yg)("li",{parentName:"ul"},"[feature]"," support snmp v3 monitoring protocol by @TJxiaobao in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1469"},"https://github.com/apache/hertzbeat/pull/1469")),(0,l.yg)("li",{parentName:"ul"},"bugfix alarm trigger-times not work when alarm and recovered trigger cyclically by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1468"},"https://github.com/apache/hertzbeat/pull/1468")),(0,l.yg)("li",{parentName:"ul"},"update switch monitoring metrics i18n by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1472"},"https://github.com/apache/hertzbeat/pull/1472")),(0,l.yg)("li",{parentName:"ul"},"fixed: snmpv3 contextName bug by @TJxiaobao in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1473"},"https://github.com/apache/hertzbeat/pull/1473")),(0,l.yg)("li",{parentName:"ul"},"Fix npt of webhook notify by @Calvin979 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1474"},"https://github.com/apache/hertzbeat/pull/1474")),(0,l.yg)("li",{parentName:"ul"},"[hertzbeat]"," release hertzbeat version v1.4.4 by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1475"},"https://github.com/apache/hertzbeat/pull/1475")),(0,l.yg)("li",{parentName:"ul"},"bugfix nginx collect http deadlock error by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1476"},"https://github.com/apache/hertzbeat/pull/1476")),(0,l.yg)("li",{parentName:"ul"},"alarm calculate ignore metrics collect code - TIMEOUT by @tomsun28 in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1478"},"https://github.com/apache/hertzbeat/pull/1478"))),(0,l.yg)("h2",{id:"new-contributors"},"New Contributors"),(0,l.yg)("ul",null,(0,l.yg)("li",{parentName:"ul"},"@ZY945 made their first contribution in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1407"},"https://github.com/apache/hertzbeat/pull/1407")),(0,l.yg)("li",{parentName:"ul"},"@prolevel1 made their first contribution in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1412"},"https://github.com/apache/hertzbeat/pull/1412")),(0,l.yg)("li",{parentName:"ul"},"@ZhangZixuan1994 made their first contribution in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1451"},"https://github.com/apache/hertzbeat/pull/1451")),(0,l.yg)("li",{parentName:"ul"},"@hurenjie1 made their first contribution in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1458"},"https://github.com/apache/hertzbeat/pull/1458")),(0,l.yg)("li",{parentName:"ul"},"@tslj1024 made their first contribution in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1461"},"https://github.com/apache/hertzbeat/pull/1461")),(0,l.yg)("li",{parentName:"ul"},"@ldysdu made their first contribution in ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/pull/1455"},"https://github.com/apache/hertzbeat/pull/1455"))),(0,l.yg)("p",null,(0,l.yg)("strong",{parentName:"p"},"Full Changelog"),": ",(0,l.yg)("a",{parentName:"p",href:"https://github.com/apache/hertzbeat/compare/v1.4.3...v1.4.4"},"https://github.com/apache/hertzbeat/compare/v1.4.3...v1.4.4")),(0,l.yg)("hr",null),(0,l.yg)("h2",{id:"-supported"},"\u26c4 Supported"),(0,l.yg)("ul",null,(0,l.yg)("li",{parentName:"ul"},"Site Monitor, Port Availability, Http Api, Ping Connectivity, Jvm, SiteMap Full Site, Ssl Certificate, SpringBoot, FTP Server"),(0,l.yg)("li",{parentName:"ul"},"Mysql, PostgreSQL, MariaDB, Redis, ElasticSearch, SqlServer, Oracle, MongoDB, Damon, OpenGauss, ClickHouse, IoTDB, Redis Cluster"),(0,l.yg)("li",{parentName:"ul"},"Linux, Ubuntu, CentOS, Windows"),(0,l.yg)("li",{parentName:"ul"},"Tomcat, Nacos, Zookeeper, RabbitMQ, Flink, Kafka, ShenYu, DynamicTp, Jetty, ActiveMQ"),(0,l.yg)("li",{parentName:"ul"},"Kubernetes, Docker"),(0,l.yg)("li",{parentName:"ul"},"Huawei Switch, HPE Switch, TP-LINK Switch, Cisco Switch"),(0,l.yg)("li",{parentName:"ul"},"and more for your custom monitoring."),(0,l.yg)("li",{parentName:"ul"},"Notifications support ",(0,l.yg)("inlineCode",{parentName:"li"},"Discord")," ",(0,l.yg)("inlineCode",{parentName:"li"},"Slack")," ",(0,l.yg)("inlineCode",{parentName:"li"},"Telegram")," ",(0,l.yg)("inlineCode",{parentName:"li"},"Mail")," ",(0,l.yg)("inlineCode",{parentName:"li"},"Pinning")," ",(0,l.yg)("inlineCode",{parentName:"li"},"WeChat")," ",(0,l.yg)("inlineCode",{parentName:"li"},"FlyBook")," ",(0,l.yg)("inlineCode",{parentName:"li"},"SMS")," ",(0,l.yg)("inlineCode",{parentName:"li"},"Webhook")," ",(0,l.yg)("inlineCode",{parentName:"li"},"ServerChan"),".")),(0,l.yg)("hr",null),(0,l.yg)("p",null,(0,l.yg)("strong",{parentName:"p"},"Github: ",(0,l.yg)("a",{parentName:"strong",href:"https://github.com/apache/hertzbeat"},"https://github.com/apache/hertzbeat")),"\n",(0,l.yg)("strong",{parentName:"p"},"Gitee: ",(0,l.yg)("a",{parentName:"strong",href:"https://gitee.com/hertzbeat/hertzbeat"},"https://gitee.com/hertzbeat/hertzbeat"))),(0,l.yg)("h3",{id:"download-link"},(0,l.yg)("strong",{parentName:"h3"},"Download Link")),(0,l.yg)("p",null,(0,l.yg)("strong",{parentName:"p"},"hertzbeat server")),(0,l.yg)("ul",null,(0,l.yg)("li",{parentName:"ul"},"\u2b07\ufe0f ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/releases/download/v1.4.4/hertzbeat-1.4.4.tar.gz"},"hertzbeat-1.4.4.tar.gz")),(0,l.yg)("li",{parentName:"ul"},"\u2b07\ufe0f ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/releases/download/v1.4.4/hertzbeat-1.4.4.zip"},"hertzbeat-1.4.4.zip")),(0,l.yg)("li",{parentName:"ul"},"\u2b07\ufe0f ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/releases/download/v1.4.4/hertzbeat-linux_amd64_1.4.4.tar.gz"},"hertzbeat-linux_amd64_1.4.4.tar.gz")),(0,l.yg)("li",{parentName:"ul"},"\u2b07\ufe0f ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/releases/download/v1.4.4/hertzbeat-linux_arm64_1.4.4.tar.gz"},"hertzbeat-linux_arm64_1.4.4.tar.gz")),(0,l.yg)("li",{parentName:"ul"},"\u2b07\ufe0f ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/releases/download/v1.4.4/hertzbeat-macos_arm64_1.4.4.tar.gz"},"hertzbeat-macos_arm64_1.4.4.tar.gz")),(0,l.yg)("li",{parentName:"ul"},"\u2b07\ufe0f ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/releases/download/v1.4.4/hertzbeat-macos_amd64_1.4.4.tar.gz"},"hertzbeat-macos_amd64_1.4.4.tar.gz")),(0,l.yg)("li",{parentName:"ul"},"\u2b07\ufe0f ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/releases/download/v1.4.4/hertzbeat-windows64_1.4.4.zip"},"hertzbeat-windows64_1.4.4.zip"))),(0,l.yg)("p",null,(0,l.yg)("strong",{parentName:"p"},"hertzbeat collector")),(0,l.yg)("ul",null,(0,l.yg)("li",{parentName:"ul"},"\u2b07\ufe0f ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/releases/download/v1.4.4/hertzbeat-collector-1.4.4.tar.gz"},"hertzbeat-collector-1.4.4.tar.gz")),(0,l.yg)("li",{parentName:"ul"},"\u2b07\ufe0f ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/releases/download/v1.4.4/hertzbeat-collector-1.4.4.zip"},"hertzbeat-collector-1.4.4.zip")),(0,l.yg)("li",{parentName:"ul"},"\u2b07\ufe0f ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/releases/download/v1.4.4/hertzbeat-collector-linux_amd64_1.4.4.tar.gz"},"hertzbeat-collector-linux_amd64_1.4.4.tar.gz")),(0,l.yg)("li",{parentName:"ul"},"\u2b07\ufe0f ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/releases/download/v1.4.4/hertzbeat-collector-linux_arm64_1.4.4.tar.gz"},"hertzbeat-collector-linux_arm64_1.4.4.tar.gz")),(0,l.yg)("li",{parentName:"ul"},"\u2b07\ufe0f ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/releases/download/v1.4.4/hertzbeat-collector-macos_arm64_1.4.4.tar.gz"},"hertzbeat-collector-macos_arm64_1.4.4.tar.gz")),(0,l.yg)("li",{parentName:"ul"},"\u2b07\ufe0f ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/releases/download/v1.4.4/hertzbeat-collector-macos_amd64_1.4.4.tar.gz"},"hertzbeat-collector-macos_amd64_1.4.4.tar.gz")),(0,l.yg)("li",{parentName:"ul"},"\u2b07\ufe0f ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/releases/download/v1.4.4/hertzbeat-collector-windows64_1.4.4.zip"},"hertzbeat-collector-windows64_1.4.4.zip"))),(0,l.yg)("p",null,(0,l.yg)("strong",{parentName:"p"},"hertzbeat docker compose script")),(0,l.yg)("ul",null,(0,l.yg)("li",{parentName:"ul"},"\u2b07\ufe0f ",(0,l.yg)("a",{parentName:"li",href:"https://github.com/apache/hertzbeat/releases/download/v1.4.4/docker-compose.zip"},"docker-compose.zip"))))}m.isMDXComponent=!0},72428:(e,t,a)=>{a.d(t,{A:()=>r});const r=a.p+"assets/images/hertzbeat-arch-d8c2eca122dd35a5e67678da69c8ba0c.png"}}]);