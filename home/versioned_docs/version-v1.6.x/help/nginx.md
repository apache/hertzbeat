---
id: nginx  
title: Monitoring Nginx      
sidebar_label: Nginx Monitor
keywords: [open source monitoring tool, open source java monitoring tool, monitoring nginx metrics]
---

> Collect and monitor the general performance Metrics of Nginx.

**Protocol Use：Nginx**

### Need Enable `ngx_http_stub_status_module` And `ngx_http_reqstat_module` Module

If you want to monitor information in 'Nginx' with this monitoring type, you need to modify your nginx configure file for enable the module monitor.

### Enable `ngx_http_stub_status_module`

1. Check if `ngx_http_stub_status_module` has been added

    ```shell
    nginx -V
    ```

    View whether it contains `--with-http_stub_status_module`, if not, you need to recompile and install Nginx.

2. Compile and install Nginx, add `ngx_http_stub_status_module` module

    Download Nginx and unzip it, execute the following command in the directory

    ```shell
    
    ./configure --prefix=/usr/local/nginx --with-http_stub_status_module
    
    make && make install
    ```

3. Modify Nginx configure file

    Modify the `nginx.conf` file and add the monitoring module exposed endpoint, as follows:

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

4. Reload Nginx

    ```shell
    
    nginx -s reload
    ```

5. Access `http://localhost/nginx-status` in the browser to view the Nginx monitoring status information.

### Enable `ngx_http_reqstat_module`

1. Install `ngx_http_reqstat_module`

   ```shell
    # install `ngx_http_reqstat_module`
    wget https://github.com/zls0424/ngx_req_status/archive/master.zip -O ngx_req_status.zip
    
    unzip ngx_req_status.zip
    
    patch -p1 < ../ngx_req_status-master/write_filter.patch
    
    ./configure --prefix=/usr/local/nginx --add-module=/path/to/ngx_req_status-master
    
    make -j2
    
    make install
    ```

2. Modify Nginx configure file

    update `nginx.conf` file, add status module exposed endpoint, as follows:

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

3. Reload Nginx

    ```shell
    
    nginx -s reload
    ```

4. Access `http://localhost/req-status` in the browser to view the Nginx monitoring status information.

**Refer Doc: <https://github.com/zls0424/ngx_req_status>**

**⚠️Attention: The endpoint path of the monitoring module is `/nginx-status` `/req-status`**

### Configuration parameter

|   Parameter name    |                                                                        Parameter help description                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Port                | Port provided by Nginx                                                                                                                                                    |
| Timeout             | Allow collection response time                                                                                                                                            |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                   |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                    |

### Collection Metrics

#### Metrics Set：nginx_status

| Metric name | Metric unit |         Metric help description         |
|-------------|-------------|-----------------------------------------|
| accepts     |             | Accepted connections                    |
| handled     |             | Successfully processed connections      |
| active      |             | Currently active connections            |
| dropped     |             | Discarded connections                   |
| requests    |             | Client requests                         |
| reading     |             | Connections performing read operations  |
| writing     |             | Connections performing write operations |
| waiting     |             | Waiting connections                     |

#### Metrics Set：req_status

| Metric name | Metric unit |    Metric help description     |
|-------------|-------------|--------------------------------|
| zone_name   |             | Group category                 |
| key         |             | Group name                     |
| max_active  |             | Maximum concurrent connections |
| max_bw      | kb          | Maximum bandwidth              |
| traffic     | kb          | Total traffic                  |
| requests    |             | Total requests                 |
| active      |             | Current concurrent connections |
| bandwidth   | kb          | Current bandwidth              |
