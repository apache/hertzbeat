>将 Alibaba Cloud Simple Log Service(SLS) 的告警通过 Webhook 方式发送到 HertzBeat 告警平台。

### 步骤一: 在 SLS 设置 Webhook 集成
1. 登录阿里云SLS控制台 > Project列表
2. 选择 **告警** > **通知对象** > **Webhook集成**
3. 添加 HertzBeat 作为告警接收端配置
  - 类型: 通用 Webhook
  - 请求方法: POST
  - 请求地址: http://{hertzbeat_host}:1157/api/alerts/report/alibabacloud-sls

### 步骤二: 在 SLS 设置通知策略
1. 登录阿里云SLS控制台 > Project列表
2. 选择 **告警** > **通知策略** > **内容模板**
3. 新增或者修改 **内容模板** > **WebHook-自定义**
  - 添加以下内容模板，或者留空时以下模板也作为默认内容模板使用
```
{
    "aliuid": {{ alert.aliuid | quote }},
    "alert_instance_id": {{ alert.alert_instance_id | quote }},
    "alert_id": {{ alert.alert_id | quote }},
    "alert_name": {{ alert.alert_name | quote }},
    "region": {{ alert.region | quote }},
    "project": {{ alert.project | quote }},
    "alert_time": {{ alert.alert_time }},
    "fire_time": {{ alert.fire_time }},
    "resolve_time": {{ alert.resolve_time }},
    "status": {{ alert.status | quote }},
    "results": {{ alert.results | to_json }},
    "fire_results": {{ alert.fire_results | to_json }},
    "fire_results_count": {{ alert.fire_results_count }},
    "labels": {{ alert.labels | to_json }},
    "annotations": {{ alert.annotations | to_json }},
    "severity": {{ alert.severity }},
    "fingerprint": {{ alert.fingerprint | quote }}
}
```

### 步骤三: 在 SLS 设置行动策略
1. 登录阿里云SLS控制台 > Project列表
2. 选择 **告警** > **通知策略** > **行动策略**
3. 若添加的是**通用 Webhook**，可跳过此步骤，只需关注 **选择Webhook**、**内容模板** 与步骤二保持一致
4. 若添加的是 **Webhook-自定义** ，需添加 HertzBeat 作为告警接收端配置
  - 请求方法: POST
  - 请求地址: http://{hertzbeat_host}:1157/api/alerts/report/alibabacloud-sls
  - 内容模板: 步骤二设置的模板

### 其他配置

#### 免登录查看告警详情
日志服务提供免登录功能，您收到告警通知后，无需登录控制台即可查看告警详情以及进行告警规则、告警事务的管理操作。
1. 在**内容模板**中添加如下配置
```
"signin_url": {{ alert.signin_url }}
```


### 常见问题

#### 告警未触发
- 确保 **通知对象**、**通知策略** 设置的正确性
- 确保 Webhook URL 可以被 SLS 通知访问
- 确保告警策略的条件正确，可查阅 **告警概览** 或者 **告警历史** 是否有触发告警

#### 更多信息请参考

- [默认内容模板](https://help.aliyun.com/zh/sls/user-guide/default-alert-templates#section-qxh-hos-yos) 
- [日志服务-告警](https://help.aliyun.com/zh/sls/user-guide/sls-alerting/?spm=a2c4g.11186623.help-menu-28958.d_2_8.4d657c08YTGFNF)
- [免登录查看告警详情](https://help.aliyun.com/zh/sls/user-guide/view-alert-details-in-logon-free-mode?spm=a2c4g.11186623.help-menu-28958.d_2_8_12_2_7.67ee3c1bZUEA9k&scm=20140722.H_346631._.OR_help-T_cn~zh-V_1)
