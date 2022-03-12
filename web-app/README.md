> 前端工程    

**面向开发者，易用友好的监控告警系统**

## 前端本地启动

### npm 方式
1. 需要nodejs npm环境   
   下载地址：https://nodejs.org/en/download
2. 在前端工程目录web-app下执行 `npm install --registry=https://registry.npm.taobao.org`
3. 全局安装angular-cli `npm install -g @angular/cli@12 --registry=https://registry.npm.taobao.org`
4. 待本地后端启动后，在web-app目录下启动本地前端 `ng serve --open`

### yarn 方式
1. 需要nodejs npm环境   
   下载地址：https://nodejs.org/en/download
2. 安装yarn `npm install -g yarn`
3. 在前端工程目录web-app下执行 `yarn install`
4. 全局安装angular-cli `npm install -g @angular/cli@12 --registry=https://registry.npm.taobao.org`
5. 待本地后端启动后，在web-app目录下启动本地前端 `ng serve --open`

## hertzbeat 编译打包  

1. web-app目录下执行

```ng build --prod --base-href /console/```

2. manager目录下执行

```mvn package```

生成的安装包在 manager/target/hertz-beta.tar.gz 
