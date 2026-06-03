>將 Alibaba Cloud Simple Log Service(SLS) 的告警通過 Webhook 方式發送到 HertzBeat 告警平台。

### 步驟一: 在 SLS 設置 Webhook 集成
1. 登錄阿里雲SLS控制枱 > Project列表
2. 選擇 **告警** > **通知對象** > **Webhook集成**
3. 添加 HertzBeat 作為告警接收端配置
- 類型: 通用 Webhook
- 請求方法: POST
- 請求地址: http://{hertzbeat_host}:1157/api/alerts/report/alibabacloud-sls

### 步驟二: 在 SLS 設置通知策略
1. 登錄阿里雲SLS控制枱 > Project列表
2. 選擇 **告警** > **通知策略** > **內容模板**
3. 新增或者修改 **內容模板** > **WebHook-自定義**
- 添加以下內容模板，或者留空時以下模板也作為默認內容模板使用
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

### 步驟三: 在 SLS 設置行動策略
1. 登錄阿里雲SLS控制枱 > Project列表
2. 選擇 **告警** > **通知策略** > **行動策略**
3. 若添加的是**通用 Webhook**，可跳過此步驟，只需關注 **選擇Webhook**、**內容模板** 與步驟二保持一致
4. 若添加的是 **Webhook-自定義** ，需添加 HertzBeat 作為告警接收端配置
- 請求方法: POST
- 請求地址: http://{hertzbeat_host}:1157/api/alerts/report/alibabacloud-sls
- 內容模板: 步驟二設置的模板

### 其他配置

#### 免登錄查看告警詳情
日誌服務提供免登錄功能，您收到告警通知後，無需登錄控制枱即可查看告警詳情以及進行告警規則、告警事務的管理操作。
1. 在**內容模板**中添加如下配置
```
"signin_url": {{ alert.signin_url }}
```


### 常見問題

#### 告警未觸發
- 確保 **通知對象**、**通知策略** 設置的正確性
- 確保 Webhook URL 可以被 SLS 通知訪問
- 確保告警策略的條件正確，可查閲 **告警概覽** 或者 **告警歷史** 是否有觸發告警

#### 更多信息請參考

- [默認內容模板](https://help.aliyun.com/zh/sls/user-guide/default-alert-templates#section-qxh-hos-yos)
- [日誌服務-告警](https://help.aliyun.com/zh/sls/user-guide/sls-alerting/?spm=a2c4g.11186623.help-menu-28958.d_2_8.4d657c08YTGFNF)
- [免登錄查看告警詳情](https://help.aliyun.com/zh/sls/user-guide/view-alert-details-in-logon-free-mode?spm=a2c4g.11186623.help-menu-28958.d_2_8_12_2_7.67ee3c1bZUEA9k&scm=20140722.H_346631._.OR_help-T_cn~zh-V_1)
