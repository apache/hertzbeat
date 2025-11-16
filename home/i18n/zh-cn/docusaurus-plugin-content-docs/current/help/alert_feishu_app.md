---
id: alert_feishu_app
title: 告警飞书自建应用通知      
sidebar_label: 告警飞书自建应用通知
keywords: [告警飞书自建应用通知 , 开源告警系统, 开源监控告警系统]
---

> 阈值触发后发送告警信息，通过飞书自建应用通知到接收人。

### 操作步骤

1. **【[飞书开放平台](https://open.feishu.cn/)】->【创建企业自建应用】->【创建】->【添加应用能力：机器人】**

2. **【开发配置】->【权限配置】：不同的通知对象类型所需要的API权限不同，可按需开通**

   | 权限名称                   | 权限代码                              | 指定用户 | 指定群聊 | 指定部门 | 所有用户 |
   |------------------------|-----------------------------------|:----:|:----:|:----:|:----:|
   | 获取用户 user ID           | contact:user.employee_id:readonly |  ✓   |      |      |  ✓   |
   | 以应用的身份发消息              | im:message:send_as_bot            |  ✓   |  ✓   |  ✓   |  ✓   |
   | 获取飞书人事（标准版）应用中的员工花名册信息 | ehr:employee:readonly             |      |      |      |  ✓   |
   | 给一个或多个部门的成员批量发消息       | im:message:send_multi_depts       |      |      |  ✓   |      |
   | 给多个用户批量发消息             | im:message:send_multi_users       |      |      |      |  ✓   |

   > 注意⚠️：在指定群聊的通知类型中，若要@某人需要开通`获取用户 user ID`权限
   >
   > 批量导入权限
   >
   > ```json
   > {
   > "scopes": {
   >  "tenant": [
   >    "contact:user.employee_id:readonly",
   >    "im:message:send_as_bot",
   >    "ehr:employee:readonly",
   >    "im:message:send_multi_depts",
   >    "im:message:send_multi_users"
   >  ],
   >  "user": []
   > }
   > }
   > ```

3. **【应用发布】->【版本发布与管理】->【创建版本】->【保存】->【发布】**

4. **【基础信息】->【凭证与基础信息】->【复制保存App ID和App Secret】**

5. **【告警通知】->【新增接收人】 ->【选择飞书自建应用通知方式】->【设置应用ID、应用secret】-> 【选择通知对象类型】-> 【设置对应的ID】**

6. **配置关联的告警通知策略⚠️ 【新增通知策略】-> 【将刚设置的接收人关联】-> 【确定】**

   > **注意⚠️ 新增了接收人并不代表已经生效可以接收告警信息，还需配置关联的告警通知策略，即指定哪些消息发给哪些接收人**。

   ![email](img/docs/help/alert-notice-4.png)


### 飞书自建应用通知常见问题

1. 飞书未收到告警通知

   > 请排查在告警中心是否已有触发的告警信息  
   > 请排查是否配置正确App ID和App Secret，是否已配置告警策略关联  
   > 请排查应用发布时该用户是否在可用范围内
   
2. 如何在指定群聊中@某人

   > 在新增接收人的表单中，填写 `用户ID` 。如果需要 @所有人，可以在 `用户ID` 字段中填入 `all`。同时支持填写多个用户id，用逗号 `,` 分隔。获取飞书用户id的具体方法，请参考：[如何获取用户的 User ID](https://open.feishu.cn/document/faq/trouble-shooting/how-to-obtain-user-id#529e21a9)
    
3. 如何获取群聊ID

    请参考：[群ID获取方式](https://open.feishu.cn/document/server-docs/group/chat/chat-id-description#394516c9)

4. 如何获取部门ID

    请参考：[部门资源介绍](https://open.feishu.cn/document/server-docs/contact-v3/department/field-overview#9c02ed7a)

其它问题可以通过交流群ISSUE反馈哦！
