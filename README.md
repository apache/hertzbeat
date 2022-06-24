<p align="center">
  <a href="https://hertzbeat.com">
     <img alt="hertzbeat" src="https://cdn.jsdelivr.net/gh/dromara/hertzbeat/home/static/img/hertzbeat-brand.svg" width="260">
  </a>
</p>

[comment]: <> (<img alt="sureness" src="https://cdn.jsdelivr.net/gh/dromara/hertzbeat/home/static/img/hertzbeat-brand.svg" width="300">)

## HertzBeat | [中文文档](README_CN.md)   

> Friendly Cloud Monitoring System. | 易用友好的云监控系统, 无需Agent, 强大自定义监控能力.   

[![Gitter](https://badges.gitter.im/hertzbeat/community.svg)](https://gitter.im/hertzbeat/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
![tan-cloud](https://img.shields.io/badge/web-monitor-4EB1BA)
![tan-cloud](https://img.shields.io/badge/api-monitor-lightgrey)
![tan-cloud](https://img.shields.io/badge/ping-connect-brightgreen)
![tan-cloud](https://img.shields.io/badge/port-available-green)
![tan-cloud](https://img.shields.io/badge/database-monitor-yellowgreen)
![tan-cloud](https://img.shields.io/badge/os-monitor-yellow)
![tan-cloud](https://img.shields.io/badge/custom-monitor-orange)
![tan-cloud](https://img.shields.io/badge/threshold-red)
![tan-cloud](https://img.shields.io/badge/alert-bule)

**Home: [hertzbeat.com](https://hertzbeat.com) | [tancloud.cn](https://tancloud.cn)**

Running HertzBeat in [OSCR.COM](https://osrc.com) Open Source Runtime Community - [Doc](https://osrc.com/user/articles/wiki_776513931985080320)   

## 🎡 <font color="green">Introduction</font>

> [HertzBeat](https://github.com/dromara/hertzbeat) is an opensource monitoring and alarm project incubated by [Dromara](https://dromara.org) and open sourced by [TanCloud](https://tancloud.cn), which supports Website, API, PING, Port, Database, OS Monitor etc.        
> We also provide **[Monitoring Cloud For Saas](https://console.tancloud.cn)**, people no longer need to deploy a cumbersome monitoring system in order to monitor their website resources. **[Sign in to get started for free](https://console.tancloud.cn)**.   
> HertzBeat supports more liberal threshold alarm configuration (calculation expression), supports alarm notification, alarm template, email, DingDing, WeChat FeiShu and WebHook.    
> Most important is HertzBeat supports [Custom Monitoring](https://hertzbeat.com/docs/advanced/extend-point), just by configuring the YML file, we can customize the monitoring types and metrics what we need.      
> HertzBeat is modular, `manager, collector, scheduler, warehouse, alerter` modules are decoupled for easy understanding and custom development.  
> Welcome to HertzBeat's [Cloud Environment TanCloud](https://console.tancloud.cn) to try and discover more.    
> Welcome to join us to build hertzbeat together.    

> `HertzBeat`'s multi-type support, easy expansion, low coupling, hope to help developers and micro teams to quickly build their own monitoring system.    

----   

[![hertzbeat](hertzbeat.gif)](https://www.bilibili.com/video/BV1DY4y1i7ts)             

----   

## 🥐 Architecture  

![hertzBeat](home/static/img/docs/hertzbeat-stru-en.svg)     


## 🐕 Quick Start   

- If you don’t want to deploy but use it directly, we provide [SAAS Monitoring Cloud-TanCloud](https://console.tancloud.cn), **[Log In And Register For Free](https://console.tancloud.cn)**.   
- If you want to deploy HertzBeat local, please refer to the following Deployment Documentation for operation.  

### 🍞 Install HertzBeat   

> HertzBeat supports installation through source code, docker or package, cpu support X86/ARM64.   

##### 1：Install quickly via docker   

1. Just one command to get started: `docker run -d -p 1157:1157 --name hertzbeat tancloud/hertzbeat` 

2. Access `localhost:1157` to start, default account: `admin/hertzbeat`  

Detailed config refer to [Install HertzBeat via Docker](https://hertzbeat.com/docs/start/docker-deploy)   

##### 2：Install via package  

1. Download the installation package [GITEE Release](https://gitee.com/dromara/hertzbeat/releases) [GITHUB Release](https://github.com/dromara/hertzbeat/releases)
2. Need Jdk Environment, `jdk8 -- jdk11`
3. [optional]Configure the HertzBeat configuration yml file `hertzbeat/config/application.yml`  
4. Run shell `$ ./startup.sh `
5. Access `localhost:1157` to start, default account: `admin/hertzbeat`  

Detailed config refer to [Install HertzBeat via Package](https://hertzbeat.com/docs/start/package-deploy)   

##### 3：Start via source code        

1. Local source code debugging needs to start the back-end project manager and the front-end project web-app.  
2. Backend：need `maven3+`, `java8+`, `lombok`, start the manager service.  
3. Web：need `nodejs npm angular-cli` environment, Run `ng serve --open` in `web-app` directory after backend startup.  
4. Access `localhost:4200` to start, default account: `admin/hertzbeat`  

Detailed steps refer to [CONTRIBUTING](CONTRIBUTING.md)        

##### 4：Install All(mysql+tdengine+hertzbeat) via Docker-compose  

Install and deploy the mysql database, tdengine database and hertzbeat at one time through [docker-compose deployment script](script/docker-compose).

Detailed steps refer to [Install via Docker-Compose](script/docker-compose/README.md)      

**HAVE FUN**  

## ✨ Contributors

Thanks these wonderful people, welcome to join us:     
[Contributor Guide](CONTRIBUTING.md)   

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://github.com/tomsun28"><img src="https://avatars.githubusercontent.com/u/24788200?v=4?s=100" width="100px;" alt=""/><br /><sub><b>tomsun28</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=tomsun28" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/commits?author=tomsun28" title="Documentation">📖</a> <a href="#design-tomsun28" title="Design">🎨</a></td>
    <td align="center"><a href="https://github.com/wang1027-wqh"><img src="https://avatars.githubusercontent.com/u/71161318?v=4?s=100" width="100px;" alt=""/><br /><sub><b>会编程的王学长</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=wang1027-wqh" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/commits?author=wang1027-wqh" title="Documentation">📖</a> <a href="#design-wang1027-wqh" title="Design">🎨</a></td>
    <td align="center"><a href="https://www.maxkey.top/"><img src="https://avatars.githubusercontent.com/u/1563377?v=4?s=100" width="100px;" alt=""/><br /><sub><b>MaxKey</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=shimingxy" title="Code">💻</a> <a href="#design-shimingxy" title="Design">🎨</a> <a href="#ideas-shimingxy" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://blog.gcdd.top/"><img src="https://avatars.githubusercontent.com/u/26523525?v=4?s=100" width="100px;" alt=""/><br /><sub><b>观沧海</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=gcdd1993" title="Code">💻</a> <a href="#design-gcdd1993" title="Design">🎨</a> <a href="https://github.com/tomsun28/hertzbeat/issues?q=author%3Agcdd1993" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/a25017012"><img src="https://avatars.githubusercontent.com/u/32265356?v=4?s=100" width="100px;" alt=""/><br /><sub><b>yuye</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=a25017012" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/commits?author=a25017012" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/jx10086"><img src="https://avatars.githubusercontent.com/u/5323228?v=4?s=100" width="100px;" alt=""/><br /><sub><b>jx10086</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=jx10086" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/issues?q=author%3Ajx10086" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/winnerTimer"><img src="https://avatars.githubusercontent.com/u/76024658?v=4?s=100" width="100px;" alt=""/><br /><sub><b>winnerTimer</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=winnerTimer" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/issues?q=author%3AwinnerTimer" title="Bug reports">🐛</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/goo-kits"><img src="https://avatars.githubusercontent.com/u/13163673?v=4?s=100" width="100px;" alt=""/><br /><sub><b>goo-kits</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=goo-kits" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/issues?q=author%3Agoo-kits" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/brave4Time"><img src="https://avatars.githubusercontent.com/u/105094014?v=4?s=100" width="100px;" alt=""/><br /><sub><b>brave4Time</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=brave4Time" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/issues?q=author%3Abrave4Time" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/walkerlee-lab"><img src="https://avatars.githubusercontent.com/u/8426753?v=4?s=100" width="100px;" alt=""/><br /><sub><b>WalkerLee</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=walkerlee-lab" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/issues?q=author%3Awalkerlee-lab" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/fullofjoy"><img src="https://avatars.githubusercontent.com/u/30247571?v=4?s=100" width="100px;" alt=""/><br /><sub><b>jianghang</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=fullofjoy" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/issues?q=author%3Afullofjoy" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/ChineseTony"><img src="https://avatars.githubusercontent.com/u/24618786?v=4?s=100" width="100px;" alt=""/><br /><sub><b>ChineseTony</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=ChineseTony" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/issues?q=author%3AChineseTony" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/wyt199905"><img src="https://avatars.githubusercontent.com/u/85098809?v=4?s=100" width="100px;" alt=""/><br /><sub><b>wyt199905</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=wyt199905" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/weifuqing"><img src="https://avatars.githubusercontent.com/u/13931013?v=4?s=100" width="100px;" alt=""/><br /><sub><b>卫傅庆</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=weifuqing" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/issues?q=author%3Aweifuqing" title="Bug reports">🐛</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/zklmcookle"><img src="https://avatars.githubusercontent.com/u/107192352?v=4?s=100" width="100px;" alt=""/><br /><sub><b>zklmcookle</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=zklmcookle" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/DevilX5"><img src="https://avatars.githubusercontent.com/u/13269921?v=4?s=100" width="100px;" alt=""/><br /><sub><b>DevilX5</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=DevilX5" title="Documentation">📖</a> <a href="https://github.com/tomsun28/hertzbeat/commits?author=DevilX5" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->  

## 💬 Join discussion  

HertzBeat is an incubation project of [Dromara Open Source Community](https://dromara.org/).

##### WeChat Group   

Add WeChat account `tan-cloud` or scan the QR code below to pull you into the WeChat group.   

<img alt="tan-cloud" src="https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/docs/help/tan-cloud-wechat.jpg" width="200"/>

##### QQ Group

QQ group number `718618151` or scan the group QR code below, verify code: `tancloud`  

<img alt="tan-cloud" src="https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/docs/help/qq-qr.jpg" width="200"/>          

##### Public WeChat      

<img alt="tan-cloud" src="https://cdn.jsdelivr.net/gh/dromara/hertzbeat/home/static/img/wechat.png" width="400"/>

##### Channel

[Gitter Channel](https://gitter.im/hertzbeat/community)

[Github Discussion](https://github.com/usthe/hertzbeat/discussions)

[User Club](https://support.qq.com/products/379369)

##### Sponsor     

Thanks [吉实信息(构建全新的微波+光交易网络)](https://www.flarespeed.com) sponsored server node.        
Thanks [蓝易云(全新智慧上云)](https://www.tsyvps.com/aff/BZBEGYLX) sponsored server node and cdn.       

## 🛡️ License
[`Apache License, Version 2.0`](https://www.apache.org/licenses/LICENSE-2.0.html)
