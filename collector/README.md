### TanCloud Collector

* 操作系统
  * Linux
  * Windows
  * Ubuntu
  * CentOs
* 数据库
  * Mysql
  * Oracle
  * PostgreSQL
* 中间件   
  * Kafka
  * Zookeeper
  * RocketMq
  * Etcd  
* 云原生  
  * Docker  
  * Kubernetes  
  * Istio  
* 应用服务  
  * Tomcat
  * Jetty
  * Http
  * Ping
  * 服务端口

#### HELP   

1. ARK插件类隔离未生效   
> 注意需构建在jdk1.8环境中运行
> 插件是否配置导入并配置正确
> 本地DEBUG时需单独IDEA打开运行collector工程，不能将plugin和collector在同一工程打开运行  

2. metaspace元空间内存占用多或溢出  
> 建议调整JVM参数 ```-Dsun.reflect.inflationThreshold=100000```       
> 由于使用太多反射，超过参数`inflationThreshold`默认值15阈值导致触发JVM反射优化(加快反射速度),
> 反射获取类信息由使用*JNI存取器**膨胀(Inflation)*
> 为*反射每个方法生成一个类加载器DelegatingClassLoader和Java类MethodAccessor*.    
> 动态加载的字节码导致PermGen持续增长.   


