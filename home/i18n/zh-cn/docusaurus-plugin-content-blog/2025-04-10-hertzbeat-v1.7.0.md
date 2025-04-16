---
title: Apache Hertzbeat 1.7.0 发布公告
author: tomsun28
author_title: tomsun28
author_url: https://github.com/zhangshenghang
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4
tags: [opensource, release]
keywords: [open source monitoring system, alerting system, Hertzbeat, release]
---

亲爱的社区小伙伴们，

我们很高兴地宣布 Apache Hertzbeat 1.7.0 版本正式发布！

## Downloads and Documentation

- **Apache Hertzbeat 1.7.0 Download Link**: <https://hertzbeat.apache.org/zh-cn/docs/download>
- **Apache Hertzbeat Documentation**: <https://hertzbeat.apache.org/zh-cn/docs/>

## Major Updates

### New Features and Enhancements

- **自定义刷新间隔**：支持为每组指标设置自定义刷新间隔，满足不同场景下的监控需求。
- **任务自动发现**：通过 http_sd 支持自动发现任务，提升了任务的灵活性和可管理性。
- **新的告警模块**：支持实时阈值和计划阈值，分组收敛，告警抑制，告警静默等。
- **Kafka 监控增强**：优化了 Kafka 监控功能，包括改进 Kafka 图表显示、添加 Kafka 消费者组监控指标等。
- **支持多种协议和监控类型**：新增了对 Plc 协议监控的支持，进一步丰富了监控范围。
- **报警功能增强**：支持通过 HTTP API 替换腾讯云 SDK 发送短信通知，增强了报警通知的灵活性和扩展性。同时，还支持了多查询表达式阈值报警、周期性报警阈值等功能。
- **多语言支持**：新增了日语、繁体中文等多语言支持，提升了国际化体验。
- **监控功能增强**：支持 StarRocks FE 等多种类型的监控，为用户提供了更多的监控选项。
- **E2E 测试增强**：新增了多个 E2E 测试代码，包括 Kafka、SSH、API 等，提升了测试覆盖率和稳定性。
- **数据存储优化**：更新了 VictoriaMetrics 和 Greptime 存储，提升了数据存储的性能和稳定性。
- **更多的新功能特性**

### Bug Fixes

- **修复 Docker 构建错误**：修复了 collector Docker 构建错误，确保了 Docker 镜像的正常构建。
- **修复 Linux 进程监控问题**：修复了 Linux 进程监控进程异常退出且无警告的问题，提升了监控的稳定性。
- **修复 Windows 中文编码问题**：修复了 Windows 中文编码问题，确保了在 Windows 环境下的正常运行。
- **修复 Grafana 配置问题**：修复了 Grafana 配置相关的问题，提升了 Grafana 的集成体验。
- **修复 Windows 指标配置问题**：更新了 Windows 指标 yml 文件，解决了相关问题。
- **修复 flyway 位置检测问题**：修复了 flyway 位置无法自动检测供应商的问题，提升了数据库迁移的可靠性。
- **修复数据存储问题**：修复了数据存储相关的问题，包括修复了 Prometheus 数据存储问题、修复了数据存储更新逻辑问题等，确保了数据的准确性和完整性。
- **修复报警通知问题**：修复了报警通知相关的问题，包括修复了报警通知重复发送问题、修复了报警通知配置问题等，提升了报警通知的准确性和可靠性。
- **修复监控状态更新问题**：修复了监控状态未更新的问题，确保了监控状态的实时性和准确性。
- **和其它的BUG修复**

### Refactoring and Optimization

- **内存结构优化**：使用Apache Arrow作为数据内存数据结构，提升了内存使用效率和性能。
- **代码规范优化**：根据代码规范对代码进行了优化，提升了代码质量和可读性。
- **缓存优化**：新增了基于 Singleton 模式的 LRU 本地缓存，提升了缓存的效率和性能。
- **内存泄漏修复**：修复了潜在的内存泄漏问题，提升了系统的稳定性和可靠性。
- **和其它的优化**

### Documentation Enhancements

- **更新部署文档**：更新了部署文档，提供了更详细的部署指导。
- **更新安全模型文档**：更新了安全模型文档。
- **更新 Grafana 配置文档**：更新了 Grafana 配置方法和添加暴露 URL 的文档，提升了用户体验。
- **更新 Windows 监控文档**：更新了 Windows 系统监控文档，提供了更详细的监控指导。
- **更新监控指标文档**：更新了多个监控指标的文档，包括 Kafka、Linux 进程等，提升了文档的准确性和完整性。
- **更新开发者文档**：新增了自定义开发采集器的文档，方便开发者进行二次开发。
- **更多的文档更新**

## Acknowledgements

感谢以下社区成员的共同努力:

> @ghyghoo8 @kerwin612 @pjfanning @helei1030 @shinestare @simonsigre @myangle1120 @MasamiYui @Craaaaazy77 @tomsun28 @Aias00 @zhangshenghang @wanhao23 @zqr10159 @LiuTianyou
> @hasimmollah @lixiaobaivv @LL-LIN @JuJinPark @ponfee @starryCoder @NikhilMurugesan @leo-934 @Rancho-7 @MonsterChenzhuo @zuobiao-zhou @pwallk @bigcyy @ZY945 @sarthakeash
> @All-The-Best-for @TJxiaobao @yyahang @yunfan24 @a-little-fool @yasminvo @Yanshuming1 @ayu-v0 @jonasHanhan @Calvin979 @Suvrat1629 @Vedant7789 @notbugggg @lctking @po-168 @doveLin0818

## What's Changed

```markdown
* [doc](download): update for v1.6.1 release by @zqr10159 in https://github.com/apache/hertzbeat/pull/2794
* [Doc] improve website by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2795
* [doc] update deploy doc by @tomsun28 in https://github.com/apache/hertzbeat/pull/2796
* [Task][OSPP] HertzBeat Official Template Marketplace by @All-The-Best-for in https://github.com/apache/hertzbeat/pull/2641
* [improve]:Improve the way Ai is entered and requested by @Yanshuming1 in https://github.com/apache/hertzbeat/pull/2762
* [bugfix] fix collector docker build error by @tomsun28 in https://github.com/apache/hertzbeat/pull/2799
* [fix]Remove the duplicate declaration of commons-net by @shinestare in https://github.com/apache/hertzbeat/pull/2801
* [doc] update new contributors by @tomsun28 in https://github.com/apache/hertzbeat/pull/2802
* [Improve] Improve module name by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2805
* [improve] code according to code specifications by @po-168 in https://github.com/apache/hertzbeat/pull/2809
* [feature] Support custom refresh intervals for each group of metrics by @zuobiao-zhou in https://github.com/apache/hertzbeat/pull/2718
* [improve] Fix error links caused by module name changes. by @zuobiao-zhou in https://github.com/apache/hertzbeat/pull/2807
* [fix] fix the Linux process monitoring process exits abnormally without warning by @LiuTianyou in https://github.com/apache/hertzbeat/pull/2810
* [Doc] Add blog by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2812
* [Improve] improve kafka monitor by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2813
* [Feature] add e2e code by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2811
* [improve] modify e2e test by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2814
* [improve] update windows metrics yml by @tomsun28 in https://github.com/apache/hertzbeat/pull/2816
* [improve] update grafana auth method and add expose url by @tomsun28 in https://github.com/apache/hertzbeat/pull/2818
* Fixed the omissions in #2805 by @kerwin612 in https://github.com/apache/hertzbeat/pull/2826
* [refactor] change name from http_sd to registry by @Calvin979 in https://github.com/apache/hertzbeat/pull/2827
* [fix]fix windows chinese encoding by @starryCoder in https://github.com/apache/hertzbeat/pull/2831
* [doc] Added custom development collector documentation by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2833
* [improve] update and fix template yml priority  by @tomsun28 in https://github.com/apache/hertzbeat/pull/2829
* [chore] Delete redundant Spaces by @ayu-v0 in https://github.com/apache/hertzbeat/pull/2834
* [doc]: update sidebar category label and plugin documentation by @zqr10159 in https://github.com/apache/hertzbeat/pull/2837
* [fix] bugfix flyway location can not auto detect vendor when not h2 by @tomsun28 in https://github.com/apache/hertzbeat/pull/2835
* [improve] update victoriametrics and greptime store by @tomsun28 in https://github.com/apache/hertzbeat/pull/2836
* [feature] support managing tasks by using http_sd by @Calvin979 in https://github.com/apache/hertzbeat/pull/2830
* [fix] auto generated by protocol buffer by @tomsun28 in https://github.com/apache/hertzbeat/pull/2842
* [Feature] Add ssh e2e code  by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2843
* [bugfix]Fix wrong app name by @zqr10159 in https://github.com/apache/hertzbeat/pull/2845
* [doc] add security model doc and update contributors by @tomsun28 in https://github.com/apache/hertzbeat/pull/2846
* [improve] improve dependency by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2855
* [doc] update security doc and some by @tomsun28 in https://github.com/apache/hertzbeat/pull/2856
* A bug fix by @TJxiaobao in https://github.com/apache/hertzbeat/pull/2853
* [doc] Add ',' separator between monitoring types by @Rancho-7 in https://github.com/apache/hertzbeat/pull/2865
* [doc]improve-windows-monitoring:Update Windows system monitoring docu… by @starryCoder in https://github.com/apache/hertzbeat/pull/2869
* [Optimize] Add a reminder about potential collection issues caused by the Docker deployment method of collector. by @zuobiao-zhou in https://github.com/apache/hertzbeat/pull/2844
* [improve]Add more helpful messages when adding a Kafka monitor by @Rancho-7 in https://github.com/apache/hertzbeat/pull/2876
* modified:add a small change. by @TJxiaobao in https://github.com/apache/hertzbeat/pull/2878
* [Fix] fix clickhouse monitor by @LiuTianyou in https://github.com/apache/hertzbeat/pull/2874
* [chore] Delete the redundant else by @ayu-v0 in https://github.com/apache/hertzbeat/pull/2881
* [improve]Remove stack property from line charts by @zqr10159 in https://github.com/apache/hertzbeat/pull/2888
* [improve]improve linux process by @LiuTianyou in https://github.com/apache/hertzbeat/pull/2889
* [Improve]Beautify Charts by @zqr10159 in https://github.com/apache/hertzbeat/pull/2891
* [doc] Add more hints when users are switching data source. by @Rancho-7 in https://github.com/apache/hertzbeat/pull/2880
* [collector]feature:Add monitoring metrics for consumer groups in Kafka client by @doveLin0818 in https://github.com/apache/hertzbeat/pull/2887
* [Improve] Improve Kafka chart display by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2894
* [collector]bugfix:fix the issue of reusing the `adminClient` in the Kafka client. by @doveLin0818 in https://github.com/apache/hertzbeat/pull/2895
* [improve]add Plc protocol , Modbus monitor by @ZY945 in https://github.com/apache/hertzbeat/pull/2850
* [Improve] add notification when port number changes automatically due to HTTPS toggle.(#2779) by @yunfan24 in https://github.com/apache/hertzbeat/pull/2896
* [feature] integrate with Apache Arrow by @Calvin979 in https://github.com/apache/hertzbeat/pull/2864
* [Doc] update doc by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2900
* [Imporve] Support Kafka internal topic configuration by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2901
* [fix](flink): update calculate metrics definitions by @zqr10159 in https://github.com/apache/hertzbeat/pull/2905
* [feature] Add a new Singleton-pattern-based LRU local cache by @doveLin0818 in https://github.com/apache/hertzbeat/pull/2907
* add an online parser for prometheus. by @leo-934 in https://github.com/apache/hertzbeat/pull/2851
* [Improve] Improve OBS by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2909
* [improve] fix import of CollectRep by @Calvin979 in https://github.com/apache/hertzbeat/pull/2910
* [feature](web-app): Add Alarm Voice Alerts by @zqr10159 in https://github.com/apache/hertzbeat/pull/2906
* [bugfix] Fix the bug where canceling an edit on a record still updates the page values. by @yunfan24 in https://github.com/apache/hertzbeat/pull/2911
* [bugfix] Fix docker container name unable to display problem by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2914
* [improve] Optimize CacheService and add relevant unit test by @lctking in https://github.com/apache/hertzbeat/pull/2912
* [improve] Add required field indicators and form validation prompts for convergence strategies and silent strategies in the form. by @yunfan24 in https://github.com/apache/hertzbeat/pull/2913
* [Feture]Add docker e2e test by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2916
* [bugfix]: fix setColumns method in CollectRep class by @zqr10159 in https://github.com/apache/hertzbeat/pull/2918
* [improve](warehouse): replace empty json object key with empty string by @zqr10159 in https://github.com/apache/hertzbeat/pull/2919
* [bugfix] Bug fix for alarm voice. by @yunfan24 in https://github.com/apache/hertzbeat/pull/2920
* Update app-windows_script.yml by @simonsigre in https://github.com/apache/hertzbeat/pull/2922
* [bugfix] Fixed the 'java.lang.UnsupportedOperationException' exception caused by getCurrentMetricsData by @lixiaobaivv in https://github.com/apache/hertzbeat/pull/2923
* [Improve] Optimize the e2e code structure by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2926
* [improve] optimize website navbar css(#2928) by @ponfee in https://github.com/apache/hertzbeat/pull/2929
* [feature] Adding CPU Temperature Check Into Default Ubuntu Checks by @simonsigre in https://github.com/apache/hertzbeat/pull/2930
* [improve] Improve the synchronization of the mute status. by @yunfan24 in https://github.com/apache/hertzbeat/pull/2927
* [bugfix]  Corrected case 'DashBoard' is a lower case 'B' by @simonsigre in https://github.com/apache/hertzbeat/pull/2935
* [bugfix]  Modify the doris_be.md document into an English version by @Craaaaazy77 in https://github.com/apache/hertzbeat/pull/2936
* [improve] Refactor and Split the Message Notification Component. by @yunfan24 in https://github.com/apache/hertzbeat/pull/2924
* [home] updated navbar css   #2928 by @Vedant7789 in https://github.com/apache/hertzbeat/pull/2934
* [Improve]Improve e2e code by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2945
* [refactor] refactoring methods replaceCryPlaceholder and replaceSmilingPlace by @hasimmollah in https://github.com/apache/hertzbeat/pull/2832
* [alarm] refactor new alarm by @tomsun28 in https://github.com/apache/hertzbeat/pull/2902
* [bugfix](db): optimize column update. by @zqr10159 in https://github.com/apache/hertzbeat/pull/2947
* [doc] Add Supported MySQL Versions. by @yunfan24 in https://github.com/apache/hertzbeat/pull/2949
* [Feature] Support customized JMX monitoring through the Factory Pattern. by @doveLin0818 in https://github.com/apache/hertzbeat/pull/2932
* [Improve]Modify Chinese comments by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2950
* [improve] fix some alarm relate bug, update alarm center ui  by @tomsun28 in https://github.com/apache/hertzbeat/pull/2951
* 【Improve】adjust log level from INFO to WARN. by @Rancho-7 in https://github.com/apache/hertzbeat/pull/2952
* [Doc]:Add English version of documentation for Kafka Consumer Detail by @Rancho-7 in https://github.com/apache/hertzbeat/pull/2953
* [Imporve] Improve Huaweicloud by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2954
* [improve] update alarm inhibit rule and alarm ui by @tomsun28 in https://github.com/apache/hertzbeat/pull/2957
* [bufix] fix collector job scheduler error by @tomsun28 in https://github.com/apache/hertzbeat/pull/2966
* [Improve]:Standardize Kafka metric naming by @Rancho-7 in https://github.com/apache/hertzbeat/pull/2961
* [BUG] "Advanced Settings" is all white in dark mode by @Suvrat1629 in https://github.com/apache/hertzbeat/pull/2965
* [Improve] add no popup option after next login by @LiuTianyou in https://github.com/apache/hertzbeat/pull/2969
* [feature] replace googletagmanager to matomo by @Aias00 in https://github.com/apache/hertzbeat/pull/2877
* Fix the search functionality issue. by @yunfan24 in https://github.com/apache/hertzbeat/pull/2970
* [bugfix](warehouse): add metrics data update logic in memory storage by @zqr10159 in https://github.com/apache/hertzbeat/pull/2973
* [Improve] Add more test cases for Kafka junit tests by @Rancho-7 in https://github.com/apache/hertzbeat/pull/2976
* [feature] alert integration extern source  by @tomsun28 in https://github.com/apache/hertzbeat/pull/2978
* [bugfix] Fix NullPointerException by @ayu-v0 in https://github.com/apache/hertzbeat/pull/2849
* [webapp] key-value-input component hover effect fixed by @ghyghoo8 in https://github.com/apache/hertzbeat/pull/2972
* [bugfix] fix alert integration extern source bug by @tomsun28 in https://github.com/apache/hertzbeat/pull/2979
* [Feature] Support copy monitoring by @zhangshenghang in https://github.com/apache/hertzbeat/pull/2981
* [bugfix] fix hbase dashboard display anomalies and turn on HTTPS by @MonsterChenzhuo in https://github.com/apache/hertzbeat/pull/2980
* [improve] update i18n json stru and update search ui by @tomsun28 in https://github.com/apache/hertzbeat/pull/2986
* [MINOR UPDATE] improve xml parsing code by @pjfanning in https://github.com/apache/hertzbeat/pull/2988
* [docs]doc:Added spark Chinese documents and changed the original spar… by @helei1030 in https://github.com/apache/hertzbeat/pull/2987
* [type:improve] fix dependencies vulnerabilites by @Aias00 in https://github.com/apache/hertzbeat/pull/2989
* [feature] Add privateKey passphrase config for linux monitor by @MasamiYui in https://github.com/apache/hertzbeat/pull/2982
* [type:fix] remove matomo ip by @Aias00 in https://github.com/apache/hertzbeat/pull/2990
* [feature] Added multilingual defaults for forms by @wanhao23 in https://github.com/apache/hertzbeat/pull/2991
* [Improve]Add Copy token button by @zqr10159 in https://github.com/apache/hertzbeat/pull/2992
* [MINOR UPDATE] close HttpResponse in HttpCollectImpl by @pjfanning in https://github.com/apache/hertzbeat/pull/2993
* [MINOR UPDATE] close http response in PrometheusAutoCollectImpl by @pjfanning in https://github.com/apache/hertzbeat/pull/2994
* [MINOR UPDATE] fix more instances of unclosed Http Responses by @pjfanning in https://github.com/apache/hertzbeat/pull/2995
* [bugfix] fix wrong http user-agent content by @tomsun28 in https://github.com/apache/hertzbeat/pull/2996
* [feature] Support monitoring for StarRocks FE and StarRocks BE. by @yunfan24 in https://github.com/apache/hertzbeat/pull/2997
* [MINOR UPDATE] refactor base64 code to simplify the conversions by @pjfanning in https://github.com/apache/hertzbeat/pull/2999
* [webapp] bugfix edit monitor http query params error by @tomsun28 in https://github.com/apache/hertzbeat/pull/3001
* [feature] Complete multiple languages by @wanhao23 in https://github.com/apache/hertzbeat/pull/3002
* [feature] Add alerter_zh_TW.properties configuration to adapt to mult… by @jonasHanhan in https://github.com/apache/hertzbeat/pull/3004
* [bugfix] fix some unit tests that failed to run by @NikhilMurugesan in https://github.com/apache/hertzbeat/pull/3007
* [feature](alert): implement drag-and-drop functionality for alert templates by @zqr10159 in https://github.com/apache/hertzbeat/pull/3005
* [improve] Freeze the 'Operate' column on the right side of the list. by @yunfan24 in https://github.com/apache/hertzbeat/pull/3009
* [MINOR UPDATE] always specify the char encoding in getBytes by @pjfanning in https://github.com/apache/hertzbeat/pull/3011
* [bugfix]Fix page not found by @zqr10159 in https://github.com/apache/hertzbeat/pull/3014
* [bugfix] Modify mask issue by @myangle1120 in https://github.com/apache/hertzbeat/pull/3018
* [issue-2998] remove invalid check in isValidLabelValue by @pjfanning in https://github.com/apache/hertzbeat/pull/3015
* [MINOR UPDATE] Use Encode to string when possible (Base64) by @pjfanning in https://github.com/apache/hertzbeat/pull/3016
* [Improve] update english doc by @zhangshenghang in https://github.com/apache/hertzbeat/pull/3028
* [Feature] Add API e2e code by @zhangshenghang in https://github.com/apache/hertzbeat/pull/3029
* [doc] update new contributor wall by @tomsun28 in https://github.com/apache/hertzbeat/pull/3025
* OnlineParserTest doesn't test anything by @pjfanning in https://github.com/apache/hertzbeat/pull/3010
* [feature] periodic alert threshold by @tomsun28 in https://github.com/apache/hertzbeat/pull/3024
* [bugfix] fix and enable some unit tests. by @yunfan24 in https://github.com/apache/hertzbeat/pull/3031
* [feature] Add pagination and name-based search functionality in notification module by @yunfan24 in https://github.com/apache/hertzbeat/pull/2948
* [bugfix] Fixed the bug in the threshold rules search box. by @yunfan24 in https://github.com/apache/hertzbeat/pull/3034
* [improve] Replaced hardcoded text with internationalized string. by @yunfan24 in https://github.com/apache/hertzbeat/pull/3035
* [update] upgrade actions/upload-artifact to v4 by @yunfan24 in https://github.com/apache/hertzbeat/pull/3046
* [improve] Search ignores case sensitivity. by @yunfan24 in https://github.com/apache/hertzbeat/pull/3042
* Add sse support for alert center, no need to manually refresh the page, add slide-in animation by @zqr10159 in https://github.com/apache/hertzbeat/pull/3051
* [alert] support multi query expr threshold  by @tomsun28 in https://github.com/apache/hertzbeat/pull/3054
* [improve](alert-center): enhance alert card animations and interactions by @zqr10159 in https://github.com/apache/hertzbeat/pull/3055
* [improve] update theme ui color  by @tomsun28 in https://github.com/apache/hertzbeat/pull/3057
* [bugfix] Fix the issue where the monitoring status is not updated. by @yunfan24 in https://github.com/apache/hertzbeat/pull/3056
* [bugfix]style(alert-center): enhance 3D transformation and z-index layers by @zqr10159 in https://github.com/apache/hertzbeat/pull/3059
* [Feature]Add zookeeper e2e code by @zhangshenghang in https://github.com/apache/hertzbeat/pull/3030
* [feature] Add Sftp config for monitor by @MasamiYui in https://github.com/apache/hertzbeat/pull/3038
* [feature] Add Japanese by @wanhao23 in https://github.com/apache/hertzbeat/pull/3013
* [bugfix] fix singleton not support remove, search id error, audio fetch 401 by @tomsun28 in https://github.com/apache/hertzbeat/pull/3062
* [API DOC] Change Swagger description by @pwallk in https://github.com/apache/hertzbeat/pull/3061
* [webapp] update ui theme by @tomsun28 in https://github.com/apache/hertzbeat/pull/3064
* [feature] Support SSH Tunnel by @pwallk in https://github.com/apache/hertzbeat/pull/3060
* [improve] Complete the missing labels in the i18n file. by @yunfan24 in https://github.com/apache/hertzbeat/pull/3065
* [Feature]Add Chinese check by @zhangshenghang in https://github.com/apache/hertzbeat/pull/3066
* [improve] Refactor SMS sending and replace Tencent Cloud SDK with HTTP API. by @yunfan24 in https://github.com/apache/hertzbeat/pull/3063
* [Bugfix] fix when the monitor is modified, the status is erroneously changed by @pwallk in https://github.com/apache/hertzbeat/pull/3067
* [improve](web-app): update monitor chart configuration and springboot GreptimeDB version by @zqr10159 in https://github.com/apache/hertzbeat/pull/3071
* [doc] Update the SMS configuration document. by @yunfan24 in https://github.com/apache/hertzbeat/pull/3073
* [feature] SMS notification supports unisms. by @yunfan24 in https://github.com/apache/hertzbeat/pull/3077
* [webapp] update and fix alert ui when theme dark by @tomsun28 in https://github.com/apache/hertzbeat/pull/3082
* [improve] Improve and unify the search. by @yunfan24 in https://github.com/apache/hertzbeat/pull/3085
* [feature] supports alibaba SMS. by @yunfan24 in https://github.com/apache/hertzbeat/pull/3084
* [improve] optimize kafka collect test by @Rancho-7 in https://github.com/apache/hertzbeat/pull/3093
* correct home's new_committer_process by @a-little-fool in https://github.com/apache/hertzbeat/pull/3094
* [bugfix] kafka client detect error by @Rancho-7 in https://github.com/apache/hertzbeat/pull/3088
* [Doc]Improve openai doc by @zhangshenghang in https://github.com/apache/hertzbeat/pull/3097
* [Improve] Message notification prompt optimization by @zhangshenghang in https://github.com/apache/hertzbeat/pull/3095
* [webapp] fix web oom crash when backend api can not access by @tomsun28 in https://github.com/apache/hertzbeat/pull/3100
* [Feature] Add deepseek Api Monitor by @zhangshenghang in https://github.com/apache/hertzbeat/pull/3096
* feat/adding-ptBR-translation by @yasminvo in https://github.com/apache/hertzbeat/pull/3098
* [bugfix] fix alert sse illegal state exception by @tomsun28 in https://github.com/apache/hertzbeat/pull/3106
* [bugfix] Fix exception thrown when searching for CollectRep.Field in the list by @JuJinPark in https://github.com/apache/hertzbeat/pull/3109
* [type: fix] #3090 garbled characters by @notbugggg in https://github.com/apache/hertzbeat/pull/3113
* [doc]fix link by @zhangshenghang in https://github.com/apache/hertzbeat/pull/3123
* [doc] Add GSOC doc by @zhangshenghang in https://github.com/apache/hertzbeat/pull/3122
* [doc] Add alibaba SMS and unisms documentation. by @yunfan24 in https://github.com/apache/hertzbeat/pull/3114
* [improve] support reuse jdbc connection switch by @tomsun28 in https://github.com/apache/hertzbeat/pull/3101
* [webapp] fix monitor define param wrong placeholder tip by @tomsun28 in https://github.com/apache/hertzbeat/pull/3118
* [bugfix] Fix swagger opening exception that Failed to load API definition. (#3127) by @yyahang in https://github.com/apache/hertzbeat/pull/3129
* [doc] welcome new committer and contributor by @tomsun28 in https://github.com/apache/hertzbeat/pull/3132
* [feature] add smslocal sms notification by @a-little-fool in https://github.com/apache/hertzbeat/pull/3135
* [improve] Optimize the progress display of monitoring imports by @MasamiYui in https://github.com/apache/hertzbeat/pull/3120
* [improve] fix potential memory leakage and content length issues. by @tomsun28 in https://github.com/apache/hertzbeat/pull/3128
* [bugfix] fix overflow arrow buffer index by @tomsun28 in https://github.com/apache/hertzbeat/pull/3137
* [improve] improve plugin upload  by @LiuTianyou in https://github.com/apache/hertzbeat/pull/3139
* [doc] Add new committer blog by @yunfan24 in https://github.com/apache/hertzbeat/pull/3140
* Configuring gitpod with java by @kerwin612 in https://github.com/apache/hertzbeat/pull/3141
* Fix the issue of the empty dropdown menu on the Kanban board page. by @kerwin612 in https://github.com/apache/hertzbeat/pull/3142
* [feature] Add AWS sms client  by @JuJinPark in https://github.com/apache/hertzbeat/pull/3134
* [feature] Support skywalking alert source by @MasamiYui in https://github.com/apache/hertzbeat/pull/3144
* [feature] support SSH proxy jump connections by @LL-LIN in https://github.com/apache/hertzbeat/pull/3138
* [improve] support bind metrics label and others into alert by @tomsun28 in https://github.com/apache/hertzbeat/pull/3146
* [bugfix] Fixed #3112, disappear left menu tree item when restart service by @notbugggg in https://github.com/apache/hertzbeat/pull/3116
* [bugfix] fix collect dispatch error by @tomsun28 in https://github.com/apache/hertzbeat/pull/3150
* [improve] Merge SMS configuration class. by @yunfan24 in https://github.com/apache/hertzbeat/pull/3148
* [webapp] fix less style file over max build error by @tomsun28 in https://github.com/apache/hertzbeat/pull/3151
* [bugfix] fix nightly docker build github action by @tomsun28 in https://github.com/apache/hertzbeat/pull/3153
* [feature] Supports sending messages to a specific Telegram group topic.(#3079) by @bigcyy in https://github.com/apache/hertzbeat/pull/3143
* Abstract Redundant Input Components into ConfigurableFieldComponent for Unified Management by @kerwin612 in https://github.com/apache/hertzbeat/pull/3152
* [feature] Support TencentCloud alert source by @bigcyy in https://github.com/apache/hertzbeat/pull/3149
* [bugfix]: fix incomplete class documentation in AppServiceImpl by @bigcyy in https://github.com/apache/hertzbeat/pull/3162
* [bugfix] Fix http header being incorrectly encoded. by @yunfan24 in https://github.com/apache/hertzbeat/pull/3108
* [bugfix] retain sorting state after monitor list auto-refresh by @LL-LIN in https://github.com/apache/hertzbeat/pull/3156
* [feature] add twilio sms client support by @sarthakeash in https://github.com/apache/hertzbeat/pull/3159
* [doc] Add alert integration japanese i18 by @MasamiYui in https://github.com/apache/hertzbeat/pull/3164
* [release] update release version 1.7.0 version and docs by @tomsun28 in https://github.com/apache/hertzbeat/pull/3165
* [feature] implement labels-based monitors filtering in bulletin creation flow by @LL-LIN in https://github.com/apache/hertzbeat/pull/3161
* [bugfix] fix postgre mount error, use mariadb instead of mysql in compose by @tomsun28 in https://github.com/apache/hertzbeat/pull/3168
* [bugfix] fix bind Labels are not updated when the Alarm Severity switches by @bigcyy in https://github.com/apache/hertzbeat/pull/3170
* [improve] update git archive export ignore by @tomsun28 in https://github.com/apache/hertzbeat/pull/3172
* [improve] update notice copyright years by @tomsun28 in https://github.com/apache/hertzbeat/pull/3171
```

## Apache Hertzbeat

**仓库地址：**

<https://github.com/apache/hertzbeat>

**网址：**

<https://hertzbeat.apache.org/>

**Apache Hertzbeat 下载地址：**

<https://hertzbeat.apache.org/zh-cn/docs/download>

**Apache Hertzbeat Docker 镜像版本：**

> Apache HertzBeat 为每个版本制作了 Docker 镜像. 你可以从 Docker Hub 拉取使用.

- HertzBeat <https://hub.docker.com/r/apache/hertzbeat>
- HertzBeat Collector <https://hub.docker.com/r/apache/hertzbeat-collector>

**Apache Hertzbeat 开源社区如何参与？**

<https://hertzbeat.apache.org/zh-cn/docs/community/contribution>
