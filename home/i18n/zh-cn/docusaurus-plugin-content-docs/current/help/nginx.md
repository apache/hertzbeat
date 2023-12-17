---
id: nginx
title: 监控 Nginx
sidebar_label: Nginx 监控
keywords: [开源监控工具, 开源Java监控工具, 监控Nginx指标]
---

> 收集和监控 Nginx 的常规性能指标。

**使用的协议：Nginx**

### 启用 Nginx 的 `ngx_http_stub_status_module` 和 `ngx_http_reqstat_module` 配置

如果你想使用这种监控方式监控 'Nginx' 的信息，你需要修改你的 Nginx 配置文件以启用监控模块。

**1、添加 ngx_http_stub_status_module 配置：**

```shell
# modify nginx.conf
server {
        listen 80; # port
        server_name localhost;
        location /nginx-status {
                stub_status     on;
                access_log      on;
                #allow 127.0.0.1;	#only allow requests from localhost
 	            #deny all;		#deny all other hosts
        }
}
```



**2、添加 ngx_http_reqstat_module 配置：**

```shell
# install `ngx_http_reqstat_module`
wget https://github.com/zls0424/ngx_req_status/archive/master.zip -O ngx_req_status.zip

unzip ngx_req_status.zip

patch -p1 < ../ngx_req_status-master/write_filter.patch

./configure --prefix=/usr/local/nginx-1.4.2 --add-module=../ngx_req_status-master

make -j2

make install
```

```shell
# modify nginx.conf
http {
        req_status_zone server_name $server_name 256k;
        req_status_zone server_addr $server_addr 256k;
        req_status_zone server_url  $server_name$uri 256k;
        req_status server_name server_addr server_url;
        server {
            server_name xxx; // server_name
            location /req-status {
              req_status_show on;
            }
        }
}
```

**⚠️`ngx_http_reqstat_module` 需要自行下载安装，如果不需要监控该模块，只需收集 `ngx_http_stub_status_module` 模块的信息即可**

**这里有帮助文档： https://blog.csdn.net/weixin_55985097/article/details/116722309**


### 配置参数

| 参数名	     | 参数描述                                                |
|-------------------|-----------------------------------------------------|
| 监控主机	   | 被监控的 IPV4、IPV6 或域名。注意⚠️不需要协议头部（例如：https://，http://） |
| 监控名称	   | 标识此监控的名称。名称需要唯一                                     |
| 端口	              | Nginx 提供的端口                                         |
| 超时时间	           | 允许收集响应时间                                            |
| 收集间隔时间	 | 监控周期性数据收集的间隔时间，单位为秒，最小可设置的间隔时间为30秒                  |
| 是否检测	 | 是否在添加监控之前检测和确认监控的可用性。只有在检测成功后，添加和修改操作才会继续进行         |
| 描述备注	 | 用户可以在此处注明有关标识和描述此监控的更多信息                            |

### 收集指标

#### 指标收集：nginx_status

| 指标名称	 | 指标单位	 | 指标描述       |
|-------|-------------|------------|
| 接收连接数 |             | 已接受的连接     |
| 处理连接数 |             | 成功处理的连接    |
| 活动连接数 |             | 当前活动连接     |
| 丢弃连接数 |             | 丢弃的连接      |
| 请求连接数 |             | 客户端请求      |
| 读连接数  |             | 正在执行读操作的连接 |
| 写连接数  |             | 正在执行写操作的连接 |
| 等待连接数 |             | 等待连接       |

#### 指标集：req_status

| 指标名称		  | 指标单位 | 指标描述    |
|---------|-------|---------|
| 分组类别    |       | 分组类别    |
| 分组名称    |       | 分组名称    |
| 最大并发连接数 |       | 最大并发连接数 |
| 最大带宽    | kb    | 最大带宽    |
| 总流量     | kb    | 总流量     |
| 总请求数    |       | 总请求数    |
| 当前并发连接数 |       | 当前并发连接数 |
| 当前带宽    | kb    | 当前带宽    |


