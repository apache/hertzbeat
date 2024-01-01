---
id: nginx  
title: Monitoring Nginx      
sidebar_label: Nginx Monitor
keywords: [open source monitoring tool, open source java monitoring tool, monitoring nginx metrics]
---

> Collect and monitor the general performance Metrics of Nginx.

**Protocol Use：Nginx**

### Nginx App Enable `ngx_http_stub_status_module` And `ngx_http_reqstat_module` Configure

If you want to monitor information in 'Nginx' with this monitoring type, you need to modify your nginx configure file for enable the module monitor.

**1、Add `ngx_http_stub_status_module` Configure:**

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



**2、Add `ngx_http_reqstat_module` Configure:**

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

**⚠️`ngx_http_reqstat_module` need to download it ourselves, If we don't need to monitor this module, we can only collect information about the `ngx_http_stub_status_module` module**

**There is help_doc: https://blog.csdn.net/weixin_55985097/article/details/116722309**


### Configuration parameter

| Parameter name      | Parameter help description                                                                                                                                                |
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

| Metric name | Metric unit | Metric help description                  |
|-------------|-------------|------------------------------------------|
| accepts     |             | Accepted connections                     |
| handled     |             | Successfully processed connections       |
| active      |             | Currently active connections             |
| dropped     |             | Discarded connections                    |
| requests    |             | Client requests                          |
| reading     |             | Connections performing read operations   |
| writing     |             | Connections performing write operations  |
| waiting     |             | Waiting connections                      |

#### Metrics Set：req_status

| Metric name | Metric unit | Metric help description         |
|-------------|-------------|---------------------------------|
| zone_name   |             | Group category                  |
| key         |             | Group name                      |
| max_active  |             | Maximum concurrent connections  |
| max_bw      | kb          | Maximum bandwidth               |
| traffic     | kb          | Total traffic                   |
| requests    |             | Total requests                  |
| active      |             | Current concurrent connections  |
| bandwidth   | kb          | Current bandwidth               |


