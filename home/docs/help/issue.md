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
