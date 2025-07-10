---
title: HertzBeat First Apache version v1.6.0 released now! 
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [open source, monitoring, alerting]
---

**Hi guys, We are excited to announce that Apache HertzBeat (incubating) has released its first Apache version v1.6.0! 🎉.**

Through nearly five months of community development iteration and two months of Apache Incubator incubation process, Apache HertzBeat (incubating) v1.6.0 is finally out.  
In this version, we added monitoring for OpenAi, Redfish protocol servers, plugin mechanism, and support for NebulaGraph, Apache Yarn, HDFS, Hbase, Storm, and more functional features.  
Due to license compatibility issues, we replaced multiple dependencies at the bottom layer, Hibernate -> EclipseLink, which is also a rare migration pitfall practice in the JPA ecosystem.  
At the same time, some bugs were fixed and some functions were optimized, and more complete documents. Welcome everyone to try to use, put forward valuable opinions and suggestions, and promote the development of HertzBeat together.

**Of course, the most important thing is to give the best thanks to the contributors in the community!**

Download Page: <https://hertzbeat.apache.org/docs/download/>

Upgrade Guide: <https://hertzbeat.apache.org/blog/2024/06/11/hertzbeat-v1.6.0-update/>

## What is HertzBeat?

[Apache HertzBeat](https://github.com/apache/hertzbeat) (incubating) is an easy-to-use, open source, real-time monitoring system with agentless, high performance cluster, prometheus-compatible, offers powerful custom monitoring and status page building capabilities.

## Features

* Combines **monitoring, alarm, and notification** features into one platform, and supports monitoring for web service, program, database, cache, os, webserver, middleware, bigdata, cloud-native, network, custom and more.
* Easy to use and agentless, web-based and with one-click monitoring and alerting, zero learning curve.
* Makes protocols such as `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` configurable, allowing you to collect any metrics by simply configuring the template `YML` file online. Imagine being able to quickly adapt to a new monitoring type like K8s or Docker simply by configuring online with HertzBeat.
* Compatible with the `Prometheus` ecosystem and more, can monitoring what `Prometheus` can monitoring with few clicks on webui.
* High performance, supports horizontal expansion of multi-collector clusters, multi-isolated network monitoring and cloud-edge collaboration.
* Provides flexible alarm threshold rules and timely notifications delivered via  `Discord` `Slack` `Telegram` `Email` `Dingtalk` `WeChat` `FeiShu` `Webhook` `SMS` `ServerChan`.
* Provides powerful status page building capabilities, easily communicate the real-time status of your service to users.

> HertzBeat's powerful customization, multi-type support, high performance, easy expansion, and low coupling, aims to help users quickly build their own monitoring system.

![HertzBeat](/img/docs/hertzbeat-arch.png)

**Github: <https://github.com/apache/hertzbeat>**

## HertzBeat's 1.6.0 Version Release

## Highlights

* HertzBeat is donated to the Apache Incubator.
* migrate repo, clean up code, license, add more help doc and more
* add dependency license doc
* [feature]Hertzbeat custom plugin. by @zqr10159 in #1973
* [feature] add apache hugegraph monitor by @zhangshenghang in #1972
* [improve]\[HIP\] HIP-01: Implement refactoring AbstractCollect by @crossoverJie in #1966
* [feature] Support monitoring of OpenAI accounts by @zuobiao-zhou in #1947
* [feature] add apache yarn monitor by @zhangshenghang in #1937
* [featrue]add apache hdfs monitor by @zhangshenghang in #1920
* [feature] support use ngql query metrics from nebulaGraph by @LiuTianyou in #1917
* [feature] support random jwt secret when not custom by @tomsun28 in #1897
* feat Support Time Type to Tengine Data Storage by @Clownsw in #1890
* [feature] support the VictoriaMetrics cluster by @xuziyang in #1880
* [feature] support flyway database migration by @tomsun28 in #1875
* [feature] Support Redfish protocol to monitoring server by @gjjjj0101 in #1867
* [feature] add influxdb metrics monitoring by @TJxiaobao in #1730
* [improve] use apache jexl replace of aviator by @tomsun28 in #1859
* [feature] Add Linux process monitoring by @zhangshenghang in #1857
* [feature] Add Apache Hbase RegionServer monitoring by @zhangshenghang in #1833
* [improve] use eclipselink orm replace of hibernate orm by @tomsun28 in #1801
* [feature]Add monitoring for Hbase Master by @zhangshenghang in #1820
* [feature] Improve the import checkstyle by @crossoverJie in #1802
* [Improve]When multiple lines are returned, each alarm is triggered instead of only the first alarm by @15613060203 in #1797
* [improve]Add external lib folder to store mysql and oracle driver. by @zqr10159 in #1783
* [feature:update-checkstyle] Limit the java file header by @YxYL6125 in #1799
* monitor center add search type modal by @tomsun28 in #1699
* mongodb monitoring support custom connection timeout param by @ZY945 in #1697
* System config theme by @TJxiaobao in #1636
* [feature] add storm monitor by @starmilkxin in #1673
* add a online prometheus parser and a prometheus-like push style. by @vinci-897 in #1644
* and more bugfix, doc, features power by our contributors, thanks to them.

## What's Changed

* bugfix collector can not startup alone by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1633>
* translate some hertzbeat blog by @TJxiaobao in <https://github.com/apache/hertzbeat/pull/1635>
* Check class description by @ZY945 in <https://github.com/apache/hertzbeat/pull/1638>
* translate class description to english by @TJxiaobao in <https://github.com/apache/hertzbeat/pull/1641>
* support monitor metrics name i18n: ClickHouse by @ZY945 in <https://github.com/apache/hertzbeat/pull/1642>
* translate blog 20220601 to English by @vinci-897 in <https://github.com/apache/hertzbeat/pull/1646>
* add a online prometheus parser and a prometheus-like push style. by @vinci-897 in <https://github.com/apache/hertzbeat/pull/1644>
* translate blog 20220320 to English by @vinci-897 in <https://github.com/apache/hertzbeat/pull/1647>
* support monitor metrics name i18n: DynamicTp by @ZY945 in <https://github.com/apache/hertzbeat/pull/1649>
* translate blog 20220228 to English by @vinci-897 in <https://github.com/apache/hertzbeat/pull/1648>
* translate blog 20220310 to English by @vinci-897 in <https://github.com/apache/hertzbeat/pull/1651>
* translate blog 20220904 to English by @vinci-897 in <https://github.com/apache/hertzbeat/pull/1652>
* support monitor metrics name i18n: Airflow by @ZY945 in <https://github.com/apache/hertzbeat/pull/1654>
* support monitor metrics name i18n: IoTDB by @ZY945 in <https://github.com/apache/hertzbeat/pull/1659>
* Translate 2022-02-11-hertzbeat document by @wang1027-wqh in <https://github.com/apache/hertzbeat/pull/1660>
* bugfix The annotation @Transactional specifies rollbackFor. by @handy-git in <https://github.com/apache/hertzbeat/pull/1643>
* add handy-git as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1661>
* feature:Translate 2022-02-17-hertzbeat Document by @wang1027-wqh in <https://github.com/apache/hertzbeat/pull/1662>
* support monitor metrics name i18n: rocketmq by @ZY945 in <https://github.com/apache/hertzbeat/pull/1663>
* [doc] update relate doc and readme by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1667>
* bugfix monitoring mongodb not work in springboot3 by @ZY945 in <https://github.com/apache/hertzbeat/pull/1668>
* [feature] add storm monitor by @starmilkxin in <https://github.com/apache/hertzbeat/pull/1673>
* [bugfix] fixed the issue in http_sd where services were incorrectly reported as available when they were actually unavailable by @starmilkxin in <https://github.com/apache/hertzbeat/pull/1678>
* remove mysql-oracle dependency jar from release package lib by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1680>
* System config theme by @TJxiaobao in <https://github.com/apache/hertzbeat/pull/1636>
* update webapp menu layout and doc by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1682>
* bugfix can not find mysql dependency when startup by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1686>
* support config common aes secret by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1683>
* [bugfix]fix the issue of add redis cluster node test error report(#1601) by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1684>
* add LiuTianyou as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1687>
* mongodb monitoring support custom connection timeout param by @ZY945 in <https://github.com/apache/hertzbeat/pull/1697>
* bugfix old data decode error when use new common-secret by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1696>
* [bugfix] fix bug where reopening pop-up window still retained previously edited data after closing. by @starmilkxin in <https://github.com/apache/hertzbeat/pull/1698>
* monitor center add search type modal by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1699>
* fix status page logo overflow by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1700>
* bugfix npe monitor jobid may be null by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1701>
* support custom main menus in monitor template by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1703>
* update home website doc by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1712>
* [Improve] change package group to org apache hertzbeat by @vinci-897 in <https://github.com/apache/hertzbeat/pull/1724>
* [improve] initial license clean up by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1725>
* update manager and collector logback config(#1704) by @handy-git in <https://github.com/apache/hertzbeat/pull/1723>
* fix(sec): upgrade com.h2database:h2 to  by @WinterKi1ler in <https://github.com/apache/hertzbeat/pull/1718>
* add WinterKi1ler as a contributor for code by @allcontributors in <https://github.com/apache/hertzbeat/pull/1736>
* update asf branch protected check by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1738>
* [doc]Update star chart by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1737>
* [fixed] fixed click collector online offline button error by @miki-hmt in <https://github.com/apache/hertzbeat/pull/1734>
* [improve] initial doc clean up by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1741>
* [Improvement]Support multiple receivers. by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1731>
* [improvement]Add lisence. by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1746>
* Backend LICENSE Initialize by @wang1027-wqh in <https://github.com/apache/hertzbeat/pull/1744>
* Back-end dependency upgrade by @TJxiaobao in <https://github.com/apache/hertzbeat/pull/1743>
* [Improve] run hertzbeat in docker compose support dependen service condition by @gjjjj0101 in <https://github.com/apache/hertzbeat/pull/1748>
* [bugfix] fix statuspage index exception by @makechoicenow in <https://github.com/apache/hertzbeat/pull/1747>
* remove unlicensed dependency 'wolfy87 eventemitter' by @alpha951 in <https://github.com/apache/hertzbeat/pull/1745>
* [improve] auto label when pr, update asf config by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1749>
* [improve] update asf config set required status checks context by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1751>
* [improve] home add apache info by @a-little-fool in <https://github.com/apache/hertzbeat/pull/1740>
* [doc] Change e2e path by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1758>
* fix : ingress tls inoperative by @PeixyJ in <https://github.com/apache/hertzbeat/pull/1760>
* [refactor] method improvement rationale by @dukbong in <https://github.com/apache/hertzbeat/pull/1757>
* [improve] create disclaimer file, add incubating in describe  by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1764>
* [improve] update new hertzbeat brand logo, update doc by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1761>
* Complete the code comment translation of the common module by @Hi-Mr-Wind in <https://github.com/apache/hertzbeat/pull/1766>
* Remove unnecessary if-else statement. by @dukbong in <https://github.com/apache/hertzbeat/pull/1770>
* [doc] remove and translate chinese to english in warehous by @xuziyang in <https://github.com/apache/hertzbeat/pull/1773>
* Replace deprecated methods with builder pattern for RedisURI construction by @dukbong in <https://github.com/apache/hertzbeat/pull/1772>
* remove and translate chinese to english in collector,script,push,remoting and manager module by @MananPoojara in <https://github.com/apache/hertzbeat/pull/1774>
* Added the function of sending SMS messages through Alibaba Cloud. by @lwqzz in <https://github.com/apache/hertzbeat/pull/1768>
* [improve]Add frontend license. by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1776>
* [test] Add RedisSingleCollectImplTest by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1784>
* [refactor] add override annotation by @handy-git in <https://github.com/apache/hertzbeat/pull/1782>
* '[docs]bugfix: display syntax error of ipmi protocol' by @tomorrowshipyltm in <https://github.com/apache/hertzbeat/pull/1793>
* [doc] translate alerter moudle code chinese to english by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1765>
* [refactor] database-related properties class, type changed to record by @xuziyang in <https://github.com/apache/hertzbeat/pull/1786>
* Fix snmp template unit conversion problem by @TJxiaobao in <https://github.com/apache/hertzbeat/pull/1796>
* [doc] Add help documentation for clickhouse monitoring by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1798>
* [feature:update-checkstyle] Limit the java file header  by @YxYL6125 in <https://github.com/apache/hertzbeat/pull/1799>
* [improve]Add external lib folder to store mysql and oracle driver. by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1783>
* [Improve]When multiple lines are returned, each alarm is triggered instead of only the first alarm by @15613060203 in <https://github.com/apache/hertzbeat/pull/1797>
* [doc] add team page in website by @alpha951 in <https://github.com/apache/hertzbeat/pull/1800>
* [feature] Improve the import checkstyle by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1802>
* [doc] Add help document for dns monitoring by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1804>
* [improve] preventing NPE by @dukbong in <https://github.com/apache/hertzbeat/pull/1808>
* [refactor] change the warehouse properties the type to record by @xuziyang in <https://github.com/apache/hertzbeat/pull/1806>
* Refactor: upgrade syntax to jdk17(instanceof & switch) by @Calvin979 in <https://github.com/apache/hertzbeat/pull/1807>
* [test] Add NginxCollect test by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1809>
* [website] update team page by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1803>
* [test] Add RedisClusterCollectImplTest by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1789>
* [improve] Fix typo ReqStatusResponse by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1811>
* Comparing N objects for null with Assert.noNullElements(). by @dukbong in <https://github.com/apache/hertzbeat/pull/1814>
* [doc] Add help document for elasticsearch monitoring and ftp monitoring by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1815>
* [doc] add help documentation for huawei switch monitoring  by @Alanxtl in <https://github.com/apache/hertzbeat/pull/1813>
* chore: upgrade the api-testing (e2e) to v0.0.16 by @LinuxSuRen in <https://github.com/apache/hertzbeat/pull/1817>
* [Remove]\[Improve\]Mail config by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1819>
* Remove and translate chinese to english in code by @dukbong in <https://github.com/apache/hertzbeat/pull/1816>
* [feature]Add monitoring for Hbase Master by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1820>
* [doc] resolve code conflicts and coverage caused by pr(#1813) merge by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1821>
* [doc] Add help document for tidb and nacos monitoring by @Alanxtl in <https://github.com/apache/hertzbeat/pull/1823>
* [improve] use eclipselink orm replace of hibernate orm by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1801>
* [improve] Add whitespace checkstyle by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1824>
* [bugfix] dns monitoring template add query class parameter by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1825>
* [Refactor] Preventing Unnecessary Object Creation and Using Utility Methods by @dukbong in <https://github.com/apache/hertzbeat/pull/1818>
* [doc]Add and modify Doris FE Chinese and English documentation by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1828>
* [docs] Optimize: add help docs for UDP port & Springboot3 help doc  by @zuobiao-zhou in <https://github.com/apache/hertzbeat/pull/1832>
* Code Simplification, Structure Changes, and Translation Work, Along with a Question by @dukbong in <https://github.com/apache/hertzbeat/pull/1827>
* [doc] add help document for mongodb monitoring by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1834>
* [collector] fix: inverts the compareTo sort of MetricsCollect run queue by @Pzz-2021 in <https://github.com/apache/hertzbeat/pull/1837>
* [doc]Doc add debian system by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1842>
* [feature] Add Apache Hbase RegionServer monitoring by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1833>
* [improve] Optimize websocket monitor by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1838>
* [refactor] Split the WarehouseProperties class by @xuziyang in <https://github.com/apache/hertzbeat/pull/1830>
* [test] Add test for HttpsdImpl by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1840>
* [fix] Fix the wrong comment by @xuziyang in <https://github.com/apache/hertzbeat/pull/1843>
* [refactor] trans and use assert by @dukbong in <https://github.com/apache/hertzbeat/pull/1841>
* [bugfix] modify the command  in the mongodb monitoring template by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1844>
* [bigfix]Fix Debian system Top10 monitoring bug by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1846>
* [cleanup]Delete the corresponding Chinese comments by @hudongdong129 in <https://github.com/apache/hertzbeat/pull/1847>
* [doc] translates chinese comment to english. by @dukbong in <https://github.com/apache/hertzbeat/pull/1853>
* [doc] fix error and add help document for prometheus task  by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1852>
* [feature] Add Linux process monitoring by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1857>
* [test] Add test for FtpCollectImpl by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1856>
* [improve] use apache jexl replace of aviator by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1859>
* [bugfix] jpa data save logic repair by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1863>
* [feature] add influxdb metrics monitoring  by @TJxiaobao in <https://github.com/apache/hertzbeat/pull/1730>
* [doc] add help document for rocketmq by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1874>
* [improve] Imporve checkstyle of test code. by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1864>
* [feature] Support Redfish protocol to monitoring server by @gjjjj0101 in <https://github.com/apache/hertzbeat/pull/1867>
* Fix debian monitoring template issue about process monitoring by @LLP2333 in <https://github.com/apache/hertzbeat/pull/1868>
* [bugfix] centos Top10 shows missing one by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1870>
* [improve] add website apache incubator footer by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1860>
* [doc] update help document by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1861>
* [featurn] support flyway database migration by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1875>
* [improve] Delete the timestamp field in the class MetricFamily.Metric by @xuziyang in <https://github.com/apache/hertzbeat/pull/1878>
* [improve] Use java.lang.AutoCloseable instead of CacheCloseable by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1879>
* [bugfix]Fix top10 process command. by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1876>
* [feature] support the VictoriaMetrics cluster by @xuziyang in <https://github.com/apache/hertzbeat/pull/1880>
* [improve] Refactor common cache code by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1881>
* Eliminate Unnecessary Unboxing and Generics by @handy-git in <https://github.com/apache/hertzbeat/pull/1882>
* [bugfix]\[doc\]Add kafka sidebar. by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1883>
* [doc] I18n for monitoring template yml metrics  by @zuobiao-zhou in <https://github.com/apache/hertzbeat/pull/1888>
* [refactor] StoreProperties is no longer useful, delete it by @xuziyang in <https://github.com/apache/hertzbeat/pull/1887>
* bugfix statistical metrics data matching fails by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1884>
* [doc] add help doc for flink monitoring  by @HeartLinked in <https://github.com/apache/hertzbeat/pull/1893>
* [doc] add almalinux documentation by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1892>
* [improve] Missing a generic by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1889>
* [bugfix] Fixed some metrics of Jexlespression not matching in Elasticsearch by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1894>
* feat(*): Support Time Type to Tengine Data Storage by @Clownsw in <https://github.com/apache/hertzbeat/pull/1890>
* [feature] support random jwt secret when not custom by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1897>
* [doc] add opensuse doc by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1902>
* fix when manager restart, collect register error by @Ceilzcx in <https://github.com/apache/hertzbeat/pull/1896>
* [bugfix] fix can not use empty collection as query params in eclipselink by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1900>
* [doc] update doc add download page and pic by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1904>
* [test] Add test for UdpCollectImpl by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1906>
* fix license by @yqxxgh in <https://github.com/apache/hertzbeat/pull/1907>
* [improve] refactor code by @Ceilzcx in <https://github.com/apache/hertzbeat/pull/1901>
* [type:bugfix] fix customized menu invalid bug #1898 by @Aias00 in <https://github.com/apache/hertzbeat/pull/1908>
* [type:bugfix] fix HTTP API bug #1895 by @Aias00 in <https://github.com/apache/hertzbeat/pull/1909>
* [test] Add test for WebsocketCollectImpl by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1912>
* [doc] translates chinese comment to english. by @westboy in <https://github.com/apache/hertzbeat/pull/1914>
* [doc] Add HIP document and template by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1913>
* [improve] clean up home webapp unused code by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1915>
* [feature] support use ngql query metrics from nebulaGraph by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1917>
* [doc] Improve the Contribution Documentation. by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1918>
* [featrue]add apache hdfs monitor by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1920>
* [doc] update hbase documentation description by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1921>
* [doc] Add documentation for nebulaGraph cluster monitoring and custom monitoring using NGQL, and clean up useless parameters by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1923>
* [test] Add test for TelnetCollectImplTest by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1924>
* fix(*): fix TdEngine Init not found Database by @Clownsw in <https://github.com/apache/hertzbeat/pull/1891>
* [doc] update contribution and add run-build guide by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1919>
* bugfix collector startup error can not find JdbcClient by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1925>
* [doc] add help document for freebsd monitoring by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1928>
* [refactoring] Split AbstractHistoryDataStorage class by @xuziyang in <https://github.com/apache/hertzbeat/pull/1926>
* [fix] fixed name error in monitoring template and improve NGQL protocol by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1931>
* [refactoring] Split AbstractRealTimeDataStorage class by @xuziyang in <https://github.com/apache/hertzbeat/pull/1935>
* [bugfix] fix ssl-cert days_remaining and npe by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1934>
* [feature] add apache yarn monitor by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1937>
* [doc] add help document for redhat monitoring and rocky linux monitoring by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1939>
* [test] Add test for NtpCollectImpl by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1940>
* [bugfix] fix alarm center tags display error by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1938>
* [improve] prepare for release hertzbeat v1.6.0 by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1929>
* add:Updated the Open Source Summer Project blog. by @TJxiaobao in <https://github.com/apache/hertzbeat/pull/1943>
* [feature] Support monitoring of OpenAI accounts by @zuobiao-zhou in <https://github.com/apache/hertzbeat/pull/1947>
* [refactoring]  Inject a single instance of the data store by @xuziyang in <https://github.com/apache/hertzbeat/pull/1944>
* [refactoring] AbstractHistoryDataStorage implement the DisposableBean by @xuziyang in <https://github.com/apache/hertzbeat/pull/1946>
* [doc] update iotdb init document by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1948>
* [improve] update build script by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1949>
* [test] add test for NgqlCollectImpl by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1953>
* [bugfix]Replace monitors to alert. by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1954>
* [improve] add llm, server menu and update doc by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1955>
* [improve]\[HIP\] HIP-01: Refactoring AbstractCollect by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1930>
* [bugfix] fix ConnectionCommonCache possible npe by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1959>
* [doc] add help document for eulerOS monitoring by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1960>
* [fixbug] Fix the problem of no data for springboot3 monitoring by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1961>
* commit：fix the front-end popup cannot exit by @Yanshuming1 in <https://github.com/apache/hertzbeat/pull/1957>
* [fixbug] expression rule adaptation by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1963>
* [doc] add  help doc for influxdb-promql and kafka-promql monitoring by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/1965>
* [doc]: update readme-cn docs by @yuluo-yx in <https://github.com/apache/hertzbeat/pull/1964>
* [improve]\[HIP\] HIP-01: Implement refactoring AbstractCollect by @crossoverJie in <https://github.com/apache/hertzbeat/pull/1966>
* [chore] update .gitignore to save .idea/icon.png by @yuluo-yx in <https://github.com/apache/hertzbeat/pull/1971>
* [improve]\[bugfix\]: fix AlertTemplateUtilTest test exception and update code style by @yuluo-yx in <https://github.com/apache/hertzbeat/pull/1969>
* [feature] add apache hugegraph monitor by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1972>
* [improve] Implement cascading parameter list for SNMP protocol by @zuobiao-zhou in <https://github.com/apache/hertzbeat/pull/1976>
* [improve] optimize DateUtil and add test case by @yuluo-yx in <https://github.com/apache/hertzbeat/pull/1974>
* [feature]Hertzbeat custom plugin. by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1973>
* update login page and status page color by @lwjxy in <https://github.com/apache/hertzbeat/pull/1977>
* [chore] update code style and add some comment by @yuluo-yx in <https://github.com/apache/hertzbeat/pull/1975>
* [doc]Hertzbeat plugin doc. by @zqr10159 in <https://github.com/apache/hertzbeat/pull/1980>
* [doc] update contributors and update status page style by @tomsun28 in <https://github.com/apache/hertzbeat/pull/1981>
* [feature] Implement cascading parameter list by @zuobiao-zhou in <https://github.com/apache/hertzbeat/pull/1978>
* [doc]update threshold alarm doc by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1983>
* [chore] optimize code style by @yuluo-yx in <https://github.com/apache/hertzbeat/pull/1984>
* [fix] Compatible with MongoDB versions earlier than 3.6 by @gjjjj0101 in <https://github.com/apache/hertzbeat/pull/1988>
* [chore] optimize manager code style by @yuluo-yx in <https://github.com/apache/hertzbeat/pull/1993>
* [doc] Translate part of documentation development.md under `zh-cn` directory from `en` to `zh-cn` by @Thespica in <https://github.com/apache/hertzbeat/pull/1995>
* [improve] http protocol prometheus parsing optimization by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/1996>
* [feature] add at function for wechat by @Yanshuming1 in <https://github.com/apache/hertzbeat/pull/1994>
* [improve] add common util test by @yuluo-yx in <https://github.com/apache/hertzbeat/pull/2001>
* [improve] update release license notice and package by @tomsun28 in <https://github.com/apache/hertzbeat/pull/2003>
* [bugfix] fix collector startup error classpath by @tomsun28 in <https://github.com/apache/hertzbeat/pull/2004>
* [chore] optimize code style by @yuluo-yx in <https://github.com/apache/hertzbeat/pull/2000>
* [improve] Bump up `eslint-plugin-jsdoc` to 48.2.5 to support node 20+ by @Thespica in <https://github.com/apache/hertzbeat/pull/2005>
* [doc] fix doc highlighting by @boatrainlsz in <https://github.com/apache/hertzbeat/pull/2006>
* [web-app]feature: case insensitive search by @JavaProgrammerLB in <https://github.com/apache/hertzbeat/pull/2007>
* [feature] Support time calculation expressions. by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/2009>
* [doc] add document for time expression by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/2012>
* [feature] Add Apache Pulsar monitor by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/2013>
* [doc] home verify release doc update by @tomsun28 in <https://github.com/apache/hertzbeat/pull/2014>
* [Improve] Improve clickhouse monitor And Improve Pulsar monitor by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/2015>
* [doc] translate help document for memcached monitoring by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/2019>
* [improve] optimize collector httpsd discovery by @yuluo-yx in <https://github.com/apache/hertzbeat/pull/1991>
* [optimize] optimize code style and logic, add unit test by @yuluo-yx in <https://github.com/apache/hertzbeat/pull/2010>
* [fix] Fix possible potential thread safe bugs by @gjjjj0101 in <https://github.com/apache/hertzbeat/pull/2021>
* [improve] add ci for home by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/2024>
* [bugfix]Tag with empty value Shouldn't transform to Tag: by @JavaProgrammerLB in <https://github.com/apache/hertzbeat/pull/2025>
* [bugfix] modify popup confirm to clear cache and cancel popup save by @Yanshuming1 in <https://github.com/apache/hertzbeat/pull/2026>
* [improve] update monitor state desc by @tomsun28 in <https://github.com/apache/hertzbeat/pull/2028>
* bugfix: fix overflow of integers by @Calvin979 in <https://github.com/apache/hertzbeat/pull/2029>
* [improve] tips need update initial default password by @tomsun28 in <https://github.com/apache/hertzbeat/pull/2030>
* [improve] deprecate support iotdb 0.* version by @Ceilzcx in <https://github.com/apache/hertzbeat/pull/2032>
* [fixbug] required field check by @zhangshenghang in <https://github.com/apache/hertzbeat/pull/2022>
* [improve] add IcmpCollectImplTest by @zuobiao-zhou in <https://github.com/apache/hertzbeat/pull/2033>
* [improve] fix code style by @zuobiao-zhou in <https://github.com/apache/hertzbeat/pull/2034>
* [improve] increase the length limit of the username field by @zuobiao-zhou in <https://github.com/apache/hertzbeat/pull/2035>
* [improve] Checkstyle include testSource by @crossoverJie in <https://github.com/apache/hertzbeat/pull/2036>
* [bugfix] fix collector and frontend dependent license error by @tomsun28 in <https://github.com/apache/hertzbeat/pull/2037>
* [improve] Add test for MemcachedCollectImpl by @zuobiao-zhou in <https://github.com/apache/hertzbeat/pull/2044>
* [imprve] Remove duplicate indices by @zuobiao-zhou in <https://github.com/apache/hertzbeat/pull/2045>
* [docs]: fix several typos in docs by @lw-yang in <https://github.com/apache/hertzbeat/pull/2047>
* Add the missing parts of docs, fix layout, sync the English version with the Chinese version by @xfl12345 in <https://github.com/apache/hertzbeat/pull/2048>
* [improve]  add filename check in home ci  by @LiuTianyou in <https://github.com/apache/hertzbeat/pull/2049>
* [improve] update dependency licenses and remove the aliyun sms depend by @tomsun28 in <https://github.com/apache/hertzbeat/pull/2058>

## New Contributors

* @handy-git made their first contribution in <https://github.com/apache/hertzbeat/pull/1643>
* @LiuTianyou made their first contribution in <https://github.com/apache/hertzbeat/pull/1684>
* @WinterKi1ler made their first contribution in <https://github.com/apache/hertzbeat/pull/1718>
* @miki-hmt made their first contribution in <https://github.com/apache/hertzbeat/pull/1734>
* @gjjjj0101 made their first contribution in <https://github.com/apache/hertzbeat/pull/1748>
* @makechoicenow made their first contribution in <https://github.com/apache/hertzbeat/pull/1747>
* @alpha951 made their first contribution in <https://github.com/apache/hertzbeat/pull/1745>
* @crossoverJie made their first contribution in <https://github.com/apache/hertzbeat/pull/1758>
* @PeixyJ made their first contribution in <https://github.com/apache/hertzbeat/pull/1760>
* @dukbong made their first contribution in <https://github.com/apache/hertzbeat/pull/1757>
* @xuziyang made their first contribution in <https://github.com/apache/hertzbeat/pull/1773>
* @MananPoojara made their first contribution in <https://github.com/apache/hertzbeat/pull/1774>
* @lwqzz made their first contribution in <https://github.com/apache/hertzbeat/pull/1768>
* @tomorrowshipyltm made their first contribution in <https://github.com/apache/hertzbeat/pull/1793>
* @YxYL6125 made their first contribution in <https://github.com/apache/hertzbeat/pull/1799>
* @15613060203 made their first contribution in <https://github.com/apache/hertzbeat/pull/1797>
* @Alanxtl made their first contribution in <https://github.com/apache/hertzbeat/pull/1813>
* @zhangshenghang made their first contribution in <https://github.com/apache/hertzbeat/pull/1820>
* @zuobiao-zhou made their first contribution in <https://github.com/apache/hertzbeat/pull/1832>
* @Pzz-2021 made their first contribution in <https://github.com/apache/hertzbeat/pull/1837>
* @LLP2333 made their first contribution in <https://github.com/apache/hertzbeat/pull/1868>
* @HeartLinked made their first contribution in <https://github.com/apache/hertzbeat/pull/1893>
* @Aias00 made their first contribution in <https://github.com/apache/hertzbeat/pull/1908>
* @westboy made their first contribution in <https://github.com/apache/hertzbeat/pull/1914>
* @Yanshuming1 made their first contribution in <https://github.com/apache/hertzbeat/pull/1957>
* @yuluo-yx made their first contribution in <https://github.com/apache/hertzbeat/pull/1964>
* @lwjxy made their first contribution in <https://github.com/apache/hertzbeat/pull/1977>
* @Thespica made their first contribution in <https://github.com/apache/hertzbeat/pull/1995>
* @boatrainlsz made their first contribution in <https://github.com/apache/hertzbeat/pull/2006>
* @JavaProgrammerLB made their first contribution in <https://github.com/apache/hertzbeat/pull/2007>
* @lw-yang made their first contribution in <https://github.com/apache/hertzbeat/pull/2047>
* @xfl12345 made their first contribution in <https://github.com/apache/hertzbeat/pull/2048>

## Just one command to get started

```docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat```

```or use quay.io (if dockerhub network connect timeout)```

```docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat quay.io/tancloud/hertzbeat```

Detailed refer to HertzBeat Document <https://hertzbeat.apache.org/docs>

---
**Github: <https://github.com/apache/hertzbeat>**

Download Page: <https://hertzbeat.apache.org/docs/download/>

Upgrade Guide: <https://hertzbeat.apache.org/blog/2024/06/11/hertzbeat-v1.6.0-update/>

Have Fun!

---

HertzBeat, Make Monitoring Easier!

Apache HertzBeat Team
