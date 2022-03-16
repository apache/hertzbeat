---
id: issue  
title: 常见问题    
sidebar_label: 常见问题       
---

### 监控常见问题   

1. ** 页面反馈：monitor.host:监控Host必须是ipv4,ipv6或域名 **   
> 如信息所示，输入的监控Host须是ipv4,ipv6或域名，不能携带协议头，例如协议头http   

2. ** 网站API等监控反馈statusCode:403或401，但对端服务本身无需认证，浏览器直接访问是OK **       
> 请排查是否是被防火墙拦截，如宝塔等默认设置了对请求header中`User-Agent=Apache-HttpClient`的拦截，若被拦截请删除此拦截规则。(v1.0.beat5版本已将user-agent模拟成浏览器此问题不存在)        

3. 安装包部署的hertzbeat下ping连通性监控异常  
安装包安装部署的hertzbeat,对ping连通性监控不可用，但本地直接ping是可用的。     
> 安装包部署需要配置java虚拟机root权限启动hertzbeat从而使用ICMP，若未启用root权限则是判断telnet对端7号端口是否开通     
> docker安装默认启用无此问题   

### Docker部署常见问题   

1. **MYSQL,TDENGINE和HertzBeat都Docker部署在同一主机上，HertzBeat使用localhost或127.0.0.1连接数据库失败**     
此问题本质为Docker容器访问宿主机端口连接失败，由于docker默认网络模式为Bridge模式，其通过localhost访问不到宿主机。
> 解决办法一：配置application.yml将数据库的连接地址由localhost修改为宿主机的对外IP     
> 解决办法二：使用Host网络模式启动Docker，即使Docker容器和宿主机共享网络 `docker run -d --network host .....`   

2. **按照流程部署，访问 http://ip:1157/console 无界面**   
请参考下面几点排查问题：  
> 一：依赖服务MYSQL数据库，TDENGINE数据库是否已按照启动成功，对应hertzbeat数据库是否已创建，SQL脚本是否执行    
> 二：HertzBeat的配置文件 `application.yml` 里面的依赖服务IP账户密码等配置是否正确  
> 三：若都无问题可以 `docker logs hertzbeat` 查看容器日志是否有明显错误，提issue或交流群或社区反馈

3. **日志报错TDengine连接或插入SQL失败**  
> 一：排查配置的数据库账户密码是否正确，数据库是否创建   
> 二：若是安装包安装的TDengine2.3+，除了启动server外，还需执行 `systemctl start taosadapter` 启动 adapter    

### 安装包部署常见问题

1. **按照流程部署，访问 http://ip:1157/console 无界面**   
   请参考下面几点排查问题：
> 一：依赖服务MYSQL数据库，TDENGINE数据库是否已按照启动成功，对应hertzbeat数据库是否已创建，SQL脚本是否执行    
> 二：HertzBeat的配置文件 `hertzbeat/config/application.yml` 里面的依赖服务IP账户密码等配置是否正确    
> 三：若都无问题可以查看 `hertzbeat/logs/` 目录下面的运行日志是否有明显错误，提issue或交流群或社区反馈

2. **日志报错TDengine连接或插入SQL失败**
> 一：排查配置的数据库账户密码是否正确，数据库是否创建   
> 二：若是安装包安装的TDengine2.3+，除了启动server外，还需执行 `systemctl start taosadapter` 启动 adapter    
