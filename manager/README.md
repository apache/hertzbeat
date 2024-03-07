### Manager Center   

Provides monitoring management, monitoring application configuration management, system user tenant background management, etc.    
提供对监控的管理，监控应用配置的管理，系统用户租户后台管理等。

### Build HertzBeat Install Package

1. Execute command in web-app

```ng build --configuration production```

2. Execute command in root

```mvn clean install```

The HertzBeat install package will at `manager/target/hertzbeat-{version}.tar.gz`

3. Build package with jdk

```mvn clean package -Pruntime```

4. Execute command in collector

```mvn clean package -Pcluster```


### Build Native

Execute command in manager

```mvn native:compile -Pnative -Dmaven.test.skip=true```
