---
title: Announcement of Apache Hertzbeat 1.7.0 Release
author: tomsun28
author_title: tomsun28
author_url: https://github.com/zhangshenghang
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4
tags: [opensource, release]
keywords: [open source monitoring system, alerting system, Hertzbeat, release]
---

Dear Community Members,

We are thrilled to announce the official release of Apache Hertzbeat version 1.7.0!

## Downloads and Documentation

- **Apache Hertzbeat 1.7.0 Download Link**: <https://hertzbeat.apache.org/docs/download>
- **Apache Hertzbeat Documentation**: <https://hertzbeat.apache.org/docs/>

## Major Updates

### New Features and Enhancements

- **Custom Refresh Interval**: Supports custom refresh intervals for each group of metrics to meet monitoring needs in different scenarios.
- **Task Auto Discovery**: Supports automatic task discovery via `http_sd`, enhancing task flexibility and manageability.
- **New Alarm Module**: Supports real-time threshold and scheduled threshold, grouped convergence, alarm suppression, alarm silencing, and more.
- **Kafka Monitoring Enhancement**: Optimized Kafka monitoring features, including improved Kafka chart displays and added Kafka consumer group monitoring metrics.
- **Support for Multiple Protocols and Monitoring Types**: Added support for monitoring `Plc` protocol, further expanding the monitoring scope.
- **Alarm Function Enhancement**: Supports replacing Tencent Cloud SDK with HTTP API for sending SMS notifications, increasing the flexibility and scalability of alarm notifications. Additionally, it supports multi-query expression threshold alarms and periodic alarm thresholds.
- **Multilingual Support**: Added support for languages such as Japanese and Traditional Chinese, enhancing the international user experience.
- **Monitoring Function Enhancement**: Supports monitoring for more types such as `StarRocks FE`, providing users with more monitoring options.
- **E2E Testing Enhancement**: Added multiple E2E test codes, including for Kafka, SSH, and API, improving test coverage and stability.
- **Data Storage Optimization**: Updated `VictoriaMetrics` and `Greptime` storage to improve data storage performance and stability.
- **More New Features**

### Bug Fixes

- **Fix Docker Build Errors**: Fixed the collector Docker build errors, ensuring normal Docker image builds.
- **Fix Linux Process Monitoring Issue**: Fixed an issue where Linux process monitoring failed without warning when a process exited abnormally, improving monitoring stability.
- **Fix Windows Chinese Encoding Issue**: Fixed the issue with Chinese encoding on Windows, ensuring normal operation in Windows environments.
- **Fix Grafana Configuration Issue**: Fixed issues related to Grafana configuration, improving the Grafana integration experience.
- **Fix Windows Metric Configuration Issue**: Updated Windows metric YAML files to resolve related issues.
- **Fix Flyway Location Detection Issue**: Fixed the issue where Flyway could not automatically detect vendor locations, improving database migration reliability.
- **Fix Data Storage Issues**: Fixed issues related to data storage, including Prometheus data storage issues and data update logic issues, ensuring data accuracy and integrity.
- **Fix Alarm Notification Issues**: Fixed issues related to alarm notifications, including duplicate sending and configuration problems, improving alarm notification accuracy and reliability.
- **Fix Monitoring Status Update Issue**: Fixed the issue where monitoring status wasn't updated, ensuring real-time and accurate monitoring status.
- **And Other Bug Fixes**

### Refactoring and Optimization

- **Memory Structure Optimization**: Used `Apache Arrow` as the in-memory data structure, improving memory usage efficiency and performance.
- **Code Standard Optimization**: Optimized the code according to coding standards, improving code quality and readability.
- **Cache Optimization**: Added an `LRU` local cache based on the Singleton pattern, improving cache efficiency and performance.
- **Memory Leak Fix**: Fixed potential memory leak issues, improving system stability and reliability.
- **And Other Optimizations**

### Documentation Enhancements

- **Updated Deployment Documentation**: Updated deployment documentation with more detailed deployment guidance.
- **Updated Security Model Documentation**: Updated the security model documentation.
- **Updated Grafana Configuration Documentation**: Updated Grafana configuration methods and documentation for exposing URLs, enhancing user experience.
- **Updated Windows Monitoring Documentation**: Updated Windows system monitoring documentation with more detailed monitoring guidance.
- **Updated Monitoring Metrics Documentation**: Updated documentation for multiple monitoring metrics, including Kafka, Linux processes, etc., improving the accuracy and completeness of the documentation.
- **Updated Developer Documentation**: Added documentation for custom collector development, helping developers with secondary development.
- **More Documentation Updates**

## Acknowledgements

Special thanks to the following community members for their collaborative efforts:

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

**Repository URL:**

<https://github.com/apache/hertzbeat>

**Official Website:**

<https://hertzbeat.apache.org/>

**Apache Hertzbeat Download Link:**

<https://hertzbeat.apache.org/docs/download>

**Apache Hertzbeat Docker Images:**

Apache Hertzbeat provides Docker images for each release, available on Docker Hub:

- HertzBeat: <https://hub.docker.com/r/apache/hertzbeat>
- HertzBeat Collector: <https://hub.docker.com/r/apache/hertzbeat-collector>

**How to Contribute to the Apache Hertzbeat Open Source Community?**

<https://hertzbeat.apache.org/docs/community/contribution>
