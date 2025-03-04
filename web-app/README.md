## Hertzbeat Web-App        

> [!NOTE]
>
> HertzBeat Web-App is a fork to [ng-alain](https://github.com/ng-alain/ng-alain/). Check [LICENSE](/LICENSE) and [license-ng-alain.txt](/material/licenses/frontend/LICENSE-ng-alain.txt) for more details.


### Quickly Start   

1. Need `Node Yarn` Environment, Make sure `Node.js >= 18`
2. Install yarn if not existed `npm install -g yarn`
3. Execute `yarn install` or `yarn install --registry=https://registry.npmmirror.com` in `web-app`
4. Start After Backend Server Available : `yarn start`


### Build HertzBeat Install Package    

1. Execute command in web-app  

    ```ng build --configuration production```

2. Execute command in root  

    ```mvn clean install```

    The HertzBeat install package will at `manager/target/hertzbeat-{version}.tar.gz`     

3. Execute command in collector  

    ```mvn clean package -Pcluster```
