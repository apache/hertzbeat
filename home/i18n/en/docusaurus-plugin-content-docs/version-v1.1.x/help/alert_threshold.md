---
id: alert_threshold  
title: Threshold alarm configuration      
sidebar_label: Threshold alarm configuration      
---

> Configure the alarm threshold (warning alarm, critical alarm, emergency alarm) for the monitoring Metrics, and the system calculates and triggers the alarm according to the threshold configuration and the collected Metric data.         

### Operation steps   

1. **【Alarm configuration】->【Add new threshold】-> 【Confirm after configuration】**  

![threshold](/img/docs/help/alert-threshold-1.png)  

As shown above：     

**Metric object**：Select the monitoring Metric object for which we need to configure the threshold. Eg：website monitoring type -> summary Metric set -> responseTime-response time Metric    
**Threshold trigger expression**：Calculate and judge whether to trigger the threshold according to this expression. See the page prompts for expression environment variables and operators. Eg：set the response time greater than 50 to trigger an alarm, and the expression is `responseTime > 50`. For detailed help on threshold expression, see [Threshold expression help](alert_threshold_expr)       
**Alarm level**：The alarm level that triggers the threshold, from low to high: warning, critical, emergency.  
**Trigger times**：How many times will the threshold be triggered before the alarm is really triggered.   
**Notification template**：Notification information Template sent after alarm triggering, See page prompts for template environment variables, eg：`${app}.${metrics}.${metric} Metric's value is ${responseTime}, greater than 50 triggers an alarm`   
**Global default**： Set whether this threshold is valid for such global Metrics, and the default is No. After adding a new threshold, you need to associate the threshold with the monitoring object, so that the threshold will take effect for this monitoring.   
**Enable alarm**：This alarm threshold configuration is enabled or disabled.   

2. **Threshold  association monitoring⚠️ 【Alarm configuration】-> 【Threshold just set】-> 【Configure associated monitoring】-> 【Confirm after configuration】**  

> **Note⚠️ After adding a new threshold, you need to associate the threshold with the monitoring object(That is, to set this threshold for which monitoring is effective), so that the threshold will take effect for this monitoring.**。   

![threshold](/img/docs/help/alert-threshold-2.png)   

![threshold](/img/docs/help/alert-threshold-3.png)   

**After the threshold alarm is configured, the alarm information that has been successfully triggered can be seen in 【alarm center】.**      
**If you need to notify the relevant personnel of the alarm information by email, Wechat, DingDing and Feishu, it can be configured in 【alarm notification】.**     

Other issues can be fed back through the communication group ISSUE!  
