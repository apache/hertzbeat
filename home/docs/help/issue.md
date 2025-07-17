---
id: issue  
title: Common issues    
sidebar_label: Common issues
---

### Monitoring common issues

1. **Page feedback：monitor.host: Monitoring Host must be ipv4, ipv6 or domain name**

   > As shown in the information, the entered monitoring Host must be ipv4, ipv6 or domain name, and cannot carry a protocol header, such as http

2. **The website API and other monitoring feedback statusCode:403 or 401, but the opposite end service itself does not need authentication, and the direct access of the browser is OK**

   > Please check whether it is blocked by the firewall. For example, BaoTa/aaPanel have set the blocking of `User-Agent=Apache-HttpClient` in the request header by default. If it is blocked, please delete this blocking rule. (user-agent has been simulated as a browser in the v1.0.beat5 version. This problem does not exist)

3. Ping connectivity monitoring exception when installing hertzbeat for package deployment.  
   The hertzbeat installed and deployed by the installation package is not available for ping connectivity monitoring, but local direct ping is available 。

   > The deployment of the installation package requires configuring the root permission of the Java virtual machine to start hertzbeat to use ICMP. If the root permission is not enabled, judge whether port 7 of telnet opposite end is opened.  
   > When you install HertzBeat via DockerDocker root is enabled by default. No such problem.  
   > See <https://stackoverflow.com/questions/11506321/how-to-ping-an-ip-address>

4. Configured Kubernetes monitoring, but the actual monitoring is not executing at the correct interval  
   Please troubleshoot the issue by following these steps:

   > 1. First, check HertzBeat's error logs. If you see the message 'desc: SQL statement too long, check maxSQLLength config',
   > 2. You need to adjust the TDengine configuration file. Create a taos.cfg file on the server and modify # max length of an SQL : maxSQLLength 654800, then restart TDengine. Ensure the configuration file is properly mounted.
   > 3. If TDengine fails to restart, adjust the configuration in the mounted data file. Refer to .../taosdata/dnode/dnodeEps.json and change dnodeFqdn to the Docker ID of the failed startup instance, then run docker restart tdengine.

5. Configured HTTP API monitoring for business interface probing to ensure service availability. The API has token authentication, e.g., "Authorization: Bearer eyJhbGciOiJIUzI1....". After configuration, testing returns "StatusCode 401". The server receives the token as "Authorization: Bearer%20eyJhbGciOiJIUzI1....". HertzBeat escapes spaces to %20, but the server does not unescape it, causing authentication failure. It is recommended to make the escaping feature optional.

6. What is the task limit for a single collector?

   > Specific limit parameters:  
   Core thread count: Math.max(2, Runtime.getRuntime().availableProcessors()) – at least 2 threads, or equal to the number of CPU cores.  
   Maximum thread count: Runtime.getRuntime().availableProcessors() * 16 – 16 times the number of CPU cores.  
   > The limit depends entirely on the server's CPU core count. For example, on an 8-core CPU server, a maximum of 8 × 16 = 128 collection tasks can be processed simultaneously. Exceeding this number triggers the error message. This is a dynamic configuration that adjusts automatically based on the hardware specifications of the runtime environment.  
   > If the runtime exceeds the maximum thread count, an error will appear: "the worker pool is full, reject this metrics task, put in queue again".  
   > In such cases, it is recommended to configure a new collector in public mode. HertzBeat will automatically distribute tasks to other collectors, avoiding errors due to the task limit of a single collector.

### Docker Deployment common issues

1. **MYSQL, TDENGINE and HertzBeat are deployed on the same host by Docker,HertzBeat use localhost or 127.0.0.1 connect to the database but fail**
   The problems lies in Docker container failed to visit and connect localhost port. Because the docker default network mode is Bridge mode which can't access local machine through localhost.

   > Solution A：Configure application.yml. Change database connection address from localhost to external IP of the host machine.  
   > Solution B：Use the Host network mode to start Docker, namely making Docker container and hosting share network. `docker run -d --network host .....`

2. **According to the process deploy，visit <http://ip:1157/> no interface**
   Please refer to the following points to troubleshoot issues：

   > one：Whether the MySQL database and tdengine database as dependent services have been successfully started, whether the corresponding hertzbeat database has been created, and whether the SQL script has been executed.
   > two：Check whether dependent service, IP account and password configuration is correct in HertzBeat's configuration file `application.yml`.  
   > three：`docker logs hertzbeat` Check whether the container log has errors. If you haven't solved the issue, report it to the communication group or community.

3. **Log an error TDengine connection or insert SQL failed**

   > one：Check whether database account and password configured is correct, the database is created.  
   > two：If you install TDengine2.3+ version, you must execute `systemctl start taosadapter` to start adapter in addition to start the server.

### Package Deployment common issues

1. **According to the process deploy，visit <http://ip:1157/> no interface**
   Please refer to the following points to troubleshoot issues:

   > one：Whether the MySQL database and tdengine database as dependent services have been successfully started, whether the corresponding hertzbeat database has been created, and whether the SQL script has been executed.  
   > two：Check whether dependent services, IP account and password configuration is correct in HertzBeat's configuration file `hertzbeat/config/application.yml`.  
   > three： Check whether the running log has errors in `hertzbeat/logs/` directory. If you haven't solved the issue, report it to the communication group or community.  

2. **Log an error TDengine connection or insert SQL failed**

   > one：Check whether database account and password configured is correct, the database is created.  
   > two：If you install TDengine2.3+ version, you must execute `systemctl start taosadapter` to start adapter in addition to start the server.  
