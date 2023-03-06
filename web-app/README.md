## Hertzbeat Web-App        

### Quickly Start   

1. Need `Node Yarn` Environment.  
2. Execute `yarn install` in `web-app`   
3. Install angular-cli : `yarn global add @angular/cli@14`    
4. Start After Backend Server Available : `ng serve --open`

---

1. 需要nodejs npm环境，下载地址：https://nodejs.org/en/download
2. 安装yarn `npm install -g yarn`
3. 在前端工程目录web-app下执行 `yarn install`
4. 全局安装angular-cli `npm install -g @angular/cli@14 --registry=https://registry.npm.taobao.org`
5. 待本地后端启动后，在web-app目录下启动本地前端 `ng serve --open`

### Build HertzBeat Install Package    

1. Execute command in web-app  

```ng build --configuration production```

2. Execute command in manager  

```mvn package```

The HertzBeat install package will at `manager/target/hertzbeat-{version}.tar.gz`     
