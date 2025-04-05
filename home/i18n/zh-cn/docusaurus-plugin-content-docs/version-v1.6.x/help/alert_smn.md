---
id: alert_smn
title: 华为云SMN通知
sidebar_label: 告警华为云SMN通知
keywords: [ 告警华为云SMN通知, 开源告警系统, 开源监控告警系统 ]
---

> 阈值触发后发送告警信息，通过华为云SMN通知到接收人。

### 操作步骤

1. **按照[华为云SMN官方文档](https://support.huaweicloud.com/qs-smn/smn_json.html)开通SMN服务并配置SMN**

    ![alert-notice-10](/img/docs/help/alert-notice-10.png)

2. **保存SMN的主题URN**

    ![alert-notice-11](/img/docs/help/alert-notice-11.png)

3. **按照[华为云签名文档](https://support.huaweicloud.com/devg-apisign/api-sign-provide.html)获取AK、SK和项目ID**

    ![alert-notice-12](/img/docs/help/alert-notice-12.png)

    ![alert-notice-13](/img/docs/help/alert-notice-13.png)

4. **【告警通知】->【新增接收人】 ->【选择华为云SMN通知方式】->【设置华为云SMN AK、SK等配置】-> 【确定】**

    ![alert-notice-14](/img/docs/help/alert-notice-14.png)

5. **配置关联的告警通知策略⚠️ 【新增通知策略】-> 【将刚设置的接收人关联】-> 【确定】**

    > **注意⚠️ 新增了接收人并不代表已经生效可以接收告警信息，还需配置关联的告警通知策略，即指定哪些消息发给哪些接收人**。

    ![email](/img/docs/help/alert-notice-4.png)

### 华为云SMN通知常见问题

1. 华为云SMN群未收到告警通知

> 请排查在告警中心是否已有触发的告警信息  
> 请排查是否正确配置华为云SMN AK、SK等配置，是否已配置告警策略关联

其它问题可以通过交流群ISSUE反馈哦！
