## Hertzbeat Web-App        

### Quickly Start   

1. Need `Node Yarn` Environment, Make sure `Node.js >= 18`
2. Execute `yarn install` in `web-app`   
3. Install angular-cli : `yarn global add @angular/cli@15`    
4. Start After Backend Server Available : `ng serve --open`

---

1. 需要nodejs npm环境，下载地址：https://nodejs.org/en/download 确保你的版本 `Node.js >= 18`
2. 安装yarn `npm install -g yarn`
3. 在前端工程目录web-app下执行 `yarn install --registry=https://registry.npmmirror.com`
4. 全局安装angular-cli `yarn global add @angular/cli@15 --registry=https://registry.npmmirror.com`
5. 待本地后端启动后，在web-app目录下启动本地前端 `ng serve --open`

### Build HertzBeat Install Package    

1. Execute command in web-app  

```ng build --configuration production```

2. Execute command in root  

```mvn clean install```

The HertzBeat install package will at `manager/target/hertzbeat-{version}.tar.gz`     

3. Execute command in collector  

```mvn clean package -Pcluster```
