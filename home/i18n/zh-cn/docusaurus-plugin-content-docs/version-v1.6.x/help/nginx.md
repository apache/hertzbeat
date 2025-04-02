---
id: nginx
title: 监控 Nginx
sidebar_label: Nginx 监控
keywords: [开源监控工具, 开源Java监控工具, 监控Nginx指标]
---

> 收集和监控 Nginx 的常规性能指标。

**使用的协议：Nginx**

### 需要启用 Nginx 的 `ngx_http_stub_status_module` 和 `ngx_http_reqstat_module` 监控模块

如果你想使用这种监控方式监控 'Nginx' 的信息，你需要修改你的 Nginx 配置文件以启用监控模块。

### 启用 ngx_http_stub_status_module

1. 检查是否已添加 `ngx_http_stub_status_module`

    ```shell
    nginx -V
    ```

    查看是否包含 `--with-http_stub_status_module`，如果没有则需要重新编译安装 Nginx。

2. 编译安装 Nginx, 添加 `ngx_http_stub_status_module` 模块

    下载 Nginx 并解压，在目录下执行

    ```shell
    ./configure --prefix=/usr/local/nginx --with-http_stub_status_module
    
    make && make install
    ```

3. 修改 Nginx 配置文件

    修改 `nginx.conf` 文件，添加监控模块暴露端点，如下配置：

    ```shell
    # modify nginx.conf
    server {
            listen 80; # port
            server_name localhost;
            location /nginx-status {
                    stub_status     on;
                    access_log      on;
                    #allow 127.0.0.1; #only allow requests from localhost
                  #deny all;  #deny all other hosts
            }
    }
    ```

4. 重新加载 Nginx

    ```shell
    nginx -s reload
    ```

5. 在浏览器访问 `http://localhost/nginx-status` 即可查看 Nginx 监控状态信息。

### 启用 `ngx_http_reqstat_module`

1. 安装 `ngx_http_reqstat_module` 模块

    ```shell
    # install `ngx_http_reqstat_module`
    wget https://github.com/zls0424/ngx_req_status/archive/master.zip -O ngx_req_status.zip
    
    unzip ngx_req_status.zip
    
    patch -p1 < ../ngx_req_status-master/write_filter.patch
    
    ./configure --prefix=/usr/local/nginx --add-module=/path/to/ngx_req_status-master
    
    make -j2
    
    make install
    ```

2. 修改 Nginx 配置文件

    修改 `nginx.conf` 文件，添加状态模块暴露端点，如下配置：

    ```shell
    # modify nginx.conf
    http {
        req_status_zone server_name $server_name 256k;
        req_status_zone server_addr $server_addr 256k;
    
        req_status server_name server_addr;
    
        server {
            location /req-status {
                req_status_show on;
                #allow 127.0.0.1; #only allow requests from localhost
              #deny all;  #deny all other hosts
            }
        }
    }
    ```

3. 重新加载 Nginx

    ```shell
    nginx -s reload
    ```

4. 在浏览器访问 `http://localhost/req-status` 即可查看 Nginx 监控状态信息。

**参考文档： <https://blog.csdn.net/weixin_55985097/article/details/116722309>**

**⚠️注意监控模块的端点路径为 `/nginx-status` `/req-status`**

### 配置参数

|  参数名   |                        参数描述                         |
|--------|-----------------------------------------------------|
| 监控主机   | 被监控的 IPV4、IPV6 或域名。注意⚠️不需要协议头部（例如：https://，http://） |
| 监控名称   | 标识此监控的名称。名称需要唯一                                     |
| 端口     | Nginx 提供的端口                                         |
| 超时时间   | 允许收集响应时间                                            |
| 收集间隔时间 | 监控周期性数据收集的间隔时间，单位为秒，最小可设置的间隔时间为30秒                  |
| 是否检测   | 是否在添加监控之前检测和确认监控的可用性。只有在检测成功后，添加和修改操作才会继续进行         |
| 描述备注   | 用户可以在此处注明有关标识和描述此监控的更多信息                            |

### 收集指标

#### 指标收集：nginx_status

| 指标名称  | 指标单位 |    指标描述    |
|-------|------|------------|
| 接收连接数 |      | 已接受的连接     |
| 处理连接数 |      | 成功处理的连接    |
| 活动连接数 |      | 当前活动连接     |
| 丢弃连接数 |      | 丢弃的连接      |
| 请求连接数 |      | 客户端请求      |
| 读连接数  |      | 正在执行读操作的连接 |
| 写连接数  |      | 正在执行写操作的连接 |
| 等待连接数 |      | 等待连接       |

#### 指标集：req_status

|  指标名称   | 指标单位 |  指标描述   |
|---------|------|---------|
| 分组类别    |      | 分组类别    |
| 分组名称    |      | 分组名称    |
| 最大并发连接数 |      | 最大并发连接数 |
| 最大带宽    | kb   | 最大带宽    |
| 总流量     | kb   | 总流量     |
| 总请求数    |      | 总请求数    |
| 当前并发连接数 |      | 当前并发连接数 |
| 当前带宽    | kb   | 当前带宽    |
