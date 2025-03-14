---
id: alert_sms  
title: 告警短信通知       
sidebar_label: 告警短信通知   
keywords: [开源监控系统, 开源告警系统, 开源短信告警通知]
---

> 当阈值触发后发送告警信息，通过短信方式通知接收人。

## 短信服务配置

只有成功配置了您自己的短信服务，监控系统内触发的告警短信才会正常发送。
hertzbeat有两种方式配置短信服务，一种是直接修改`application.yml`配置文件，另一种是通过hertzbeat前端界面（系统设置 > 消息服务配置）配置。
> 注意⚠️:两种方式配置的短信服务只能选择一种生效，当两种方式都配置并且开启时，hertzbeat将会优先使用前端界面配置的短信服务。

### 腾讯云短信配置

在`application.yml`新增/填写如下腾讯平台短信服务器配置(参数需替换为您的短信服务器配置)

```yaml
alerter:
  sms:
    enable: true     # 是否启用
    type: tencent    # 短信服务商类型，支持tencent、
    tencent:         # 腾讯云短信配置
      secret-id: AKIDbQ4VhdMr89wDedFrIcgU2PaaMvOuBCzY
      secret-key: PaXGl0ziY9UcWFjUyiFlCPMr77rLkJYlyA
      app-id: 1435441637
      sign-name: 赫兹跳动
      template-id: 1343434
```

1. 腾讯云短信创建签名（sign-name）
   ![image](https://github.com/apache/hertzbeat/assets/40455946/3a4c287d-b23d-4398-8562-4894296af485)

2. 腾讯云短信创建正文模板（template-id）

   ```text
   监控:{1}，告警级别:{2}。内容:{3}
   ```

   ![image](https://github.com/apache/hertzbeat/assets/40455946/face71a6-46d5-452c-bed3-59d2a975afeb)

3. 腾讯云短信创建应用（app-id）
   ![image](https://github.com/apache/hertzbeat/assets/40455946/2732d710-37fa-4455-af64-48bba273c2f8)

4. 腾讯云访问管理（secret-id、secret-key）
   ![image](https://github.com/apache/hertzbeat/assets/40455946/36f056f0-94e7-43db-8f07-82893c98024e)

### 阿里云短信配置

开通使用阿里云短信服务，您可参考阿里云官方文档：[短信新手操作指引](https://help.aliyun.com/zh/sms/getting-started/get-started-with-sms)

您可以使用图形化界面配置阿里云短信服务，也可以在`application.yml`中配置阿里云短信服务。
使用`application.yml`需要新增/填写如下阿里云短信配置(参数需替换为您的短信服务器配置)

```yaml
alerter:
   sms:
      enable: true    # 启用配置
      type: alibaba   # 短信服务商类型，设置为alibaba
      alibaba:        # 填写阿里云短信配置
         access-key-id:      # 您的AccessKey ID
         access-key-secret:  # 您的AccessKey Secret
         sign-name:          # 短信签名
         template-code:      # 短信模板CODE
```

1. 创建阿里云账号并开通短信服务
   - 访问[阿里云短信服务控制台](https://dysms.console.aliyun.com/)
   - 开通短信服务

2. 创建短信签名（sign-name）
   - 登录[短信服务控制台](https://dysms.console.aliyun.com/)
   - 选择国内/国际短信服务
   - 进入"签名管理"页面，点击"添加签名"
   - 填写签名信息并提交审核
   - 等待签名审核通过

3. 创建短信模板（template-code）
   - 进入"模板管理"页面
   - 点击"添加模板"
   - 创建如下格式的模板：

   ```text
   监控项：${instance}，告警级别：${priority}。内容：${content}
   ```

   - 提交模板等待审核

4. 获取访问密钥（access-key-id、access-key-secret）
   :::tip
   阿里云官方建议使用 RAM 用户 AccessKey，并进行最小化授权。
   :::
   - 进入[RAM访问控制](https://ram.console.aliyun.com/users)管理RAM用户
   - 创建用户并选择"使用永久 AccessKey 访问"
   - 安全保存AccessKey ID和AccessKey Secret
   - 为用户授权短信服务权限"AliyunDysmsFullAccess"

现在您可以把这些信息配置到您的hertzbeat应用中。

### uni-sms配置

uni-sms是一个聚合短信服务平台，您可以参考[UniSMS合一短信文档](https://unisms.apistd.com/docs/tutorials)进行配置。

在`application.yml`新增/填写如下uni-sms短信服务配置(参数需替换为您的短信服务器配置)

```yaml
alerter:
  sms:
    enable: true    # 启用配置
    type: unisms   # 短信服务商类型，设置为unisms
    unisms:        # 填写uni-sms短信配置
       # auth-mode: simple or hmac
       auth-mode: simple
       access-key-id: YOUR_ACCESS_KEY_ID
       # hmac mode need to fill in access-key-secret
       access-key-secret: YOUR_ACCESS_KEY_SECRET
       signature: YOUR_SMS_SIGNATURE
       template-id: YOUR_TEMPLATE_ID
```

1. 注册uni-sms账号
   - 访问[uni-sms官网](https://unisms.apistd.com/)

2. 创建短信签名（signature）
   - 登录[uni-sms控制台](https://unisms.apistd.com/console/)
   - 进入"短信报备-签名管理"页面
   - 点击"添加签名"
   - 填写签名信息并提交审核
   - 等待签名审核通过

3. 创建短信模板（template-id）
   - 进入"短信报备-模板管理"页面
   - 点击"添加模板"
   - 创建如下格式的模板：

   ```text
   监控项：{instance}，告警级别：{priority}。内容：{content}
   ```

   - 提交模板等待审核

4. 获取`access-key-id`和`access-key-secret`
   - 登录[uni-sms控制台](https://unisms.apistd.com/console/)
   - 进入"凭证管理"页面
   - 获取AccessKey ID和AccessKey Secret
   - 安全保存AccessKey ID和AccessKey Secret

   :::note
   UniSMS 提供以下两种鉴权方式共开发者选择，可在控制台-凭证管理中设置，默认为简易模式。
     - 简易模式 [默认]：此模式仅核验 AccessKey ID，不对请求参数进行验签，方便开发者快速接入。
     - HMAC模式：此模式要求使用 AccessKey Secret 对请求参数进行验签，以加强保障请求的安全与真实性。
   :::

### AWS Cloud SMS配置

要激活和使用 AWS Cloud SMS 服务，请参考官方 AWS 文档: [SMS Getting Started Guide](https://docs.aws.amazon.com/sms-voice/latest/userguide/what-is-sms-mms.html)

您可以通过图形界面或 application.yml 文件配置 AWS Cloud SMS 服务。
要使用 application.yml，请添加/填写以下 AWS Cloud SMS 配置（请用您的 SMS 服务器配置信息替换参数）：

```yaml
alerter:
   sms:
      enable: true    # Whether to enable
      type: aws       # SMS provider type, supports "aws"
      aws:            # AWS Cloud SMS configuration
         access-key-id:      # Your AccessKey ID
         access-key-secret:  # Your AccessKey Secret
         region:             # Region Of Your AWS 
```

1. 创建 AWS 账户
   - 如果您尚未创建 AWS 账户，请访问 [AWS Cloud SMS Console](https://aws.amazon.com/console/)进行注册。

2. 获取访问密钥凭据（access-key-id, access-key-secret）
   - 进入 AWS IAM（身份与访问管理）控制台。
   - 创建一个具有编程访问权限的 IAM 用户，并附加必要的权限。
   - 获取您的 Access Key ID 和 Secret Access Key（配置时需要）。

3. 选择要用于 AWS 终端用户消息传递服务的特定区域
   - 选择支持 AWS 终端用户消息传递（SMS 服务）的区域。
   - 您可以在 这里 查看支持的区域[here](https://docs.aws.amazon.com/sms-voice/latest/userguide/phone-numbers-sms-by-country.html).

4. 将 AWS SMS 从沙盒模式移动到生产模式
   - 默认情况下，AWS SMS 以沙盒模式运行，在该模式下，短信仅能发送到已验证的电话号码。
     要将消息发送到任意号码，您必须将您的账户升级到生产模式。请参考此 指南。 [guide](https://docs.aws.amazon.com/sms-voice/latest/userguide/sandbox.html#sandbox-sms-move-to-production)

5. 验证目标电话号码（适用于沙盒模式）
   - 如果您的账户仍处于沙盒模式，您只能向已验证的电话号码发送短信。要添加已验证的号码，请参考此 [guide](https://docs.aws.amazon.com/sms-voice/latest/userguide/verify-destination-phone-number.html)
   - 注意： 您不需要创建 Origination Identity 或 Origination Simulator，只需使用 AWS CLI 添加已验证的电话号码。

   > 短信模板格式固定如下：“Instance: {}, Priority: {}, Content: {}”

   现在，您可以在您的 Hertzbeat 应用程序中配置这些信息.

现在您可以把这些信息配置到您的hertzbeat应用中。

### smslocal短信配置

smslocal是一款面向企业的一体化短信服务平台，具备诸如多种发送方式、强大的安全性以及全天候支持等特性。你可以参考 smslocal 的[开发者文档](https://www.smslocal.com/developer/)来进行配置。

在 `application.yml` 中添加/填写以下 smslocal 配置内容（请用你自己的短信服务器配置参数替换相关参数）：

```yaml
alerter:
  sms:
    enable: true    # 是否启用
    type: smslocal   # 短信服务提供商类型，设置为smslocal
    smslocal:        # smslocal配置
       api-key: 在此处填入你的API密钥
```

1. 注册 smslocal 账号
   - 访问 [smslocal官网](https://www.smslocal.com/)

2. 获取 `api-key`
   - 登录 [smslocal API accessKey访问页面](https://secure.smslocal.com/cpaas/pages/profile/settings/api-reference)
   - 进入 “API 访问” 页面
   - 点击眼睛图标按钮
   - 复制显示的访问密钥
   - 然后你就可以配置 `application.yml` 文件了

现在你可以在你的 Hertzbeat 应用程序中配置这些信息。

## 操作步骤

1. **【告警通知】->【新增接收人】 ->【选择短信通知方式】**

2. **配置关联的告警通知策略⚠️ 【新增通知策略】-> 【关联刚才设置的接收人】-> 【确认】**

   > **注意⚠️ 新增接收人并不代表就生效能收到告警信息，还需要配置关联的告警通知策略，即指定哪些消息发给哪些接收人。**

如有问题可通过交流群ISSUE反馈！
