---
id: alert_sms  
title: Alert SMS notification       
sidebar_label: Alert SMS notification   
keywords: [open source monitoring tool, open source alerter, open source SMS alert notification]
---

> After the threshold is triggered send alarm information and notify the recipient by SMS.

## SMS Service Configuration

Only when you successfully configure your own SMS service will the alert SMS triggered within the monitoring system be sent correctly.  
HertzBeat provides two ways to configure the SMS service: modifying the `application.yml` configuration file directly or configuring it through the HertzBeat frontend interface (Settings > Message Server Setting).

> ⚠️ Note: Only one method can be effective at a time. If both methods are configured and enabled, HertzBeat will prioritize the SMS service configured in the frontend interface.

### Tencent Cloud SMS Configuration

Add/Fill in the following Tencent Cloud SMS server configuration to `application.yml` (replace parameters with your own SMS server configuration):

```yaml
alerter:
  sms:
    enable: true     # Whether to enable
    type: tencent    # SMS provider type, supports "tencent"
    tencent:         # Tencent Cloud SMS configuration
      secret-id: AKIDbQ4VhdMr89wDedFrIcgU2PaaMvOuBCzY
      secret-key: PaXGl0ziY9UcWFjUyiFlCPMr77rLkJYlyA
      app-id: 1435441637
      sign-name: HertzBeat
      template-id: 1343434
```

1. Create a signature (sign-name) in Tencent Cloud SMS  
   ![image](https://github.com/apache/hertzbeat/assets/40455946/3a4c287d-b23d-4398-8562-4894296af485)

2. Create a message template (template-id) in Tencent Cloud SMS

   ```text
   Monitor: {1}, Alert Level: {2}. Content: {3}
   ```

   ![image](https://github.com/apache/hertzbeat/assets/40455946/face71a6-46d5-452c-bed3-59d2a975afeb)

3. Create an application (app-id) in Tencent Cloud SMS  
   ![image](https://github.com/apache/hertzbeat/assets/40455946/2732d710-37fa-4455-af64-48bba273c2f8)

4. Obtain Tencent Cloud Access Management credentials (secret-id, secret-key)  
   ![image](https://github.com/apache/hertzbeat/assets/40455946/36f056f0-94e7-43db-8f07-82893c98024e)

### Alibaba Cloud SMS Configuration

To activate and use Alibaba Cloud SMS service, you can refer to the official Alibaba Cloud documentation: [SMS Getting Started Guide](https://help.aliyun.com/zh/sms/getting-started/get-started-with-sms)

You can configure the Alibaba Cloud SMS service either through the graphical interface or in the `application.yml` file.
To use `application.yml`, add/fill in the following Alibaba Cloud SMS configuration (replace parameters with your own SMS server configuration):

```yaml
alerter:
   sms:
      enable: true    # Whether to enable
      type: alibaba   # SMS provider type, supports "alibaba"
      alibaba:        # Alibaba Cloud SMS configuration
         access-key-id:      # Your AccessKey ID
         access-key-secret:  # Your AccessKey Secret
         sign-name:          # SMS signature
         template-code:      # SMS template code
```

1. Create an Alibaba Cloud account and activate SMS service
   - Visit [Alibaba Cloud SMS Console](https://dysms.console.aliyun.com/)
   - Activate SMS service

2. Create a signature (sign-name)
   - Log in to [SMS Console](https://dysms.console.aliyun.com/)
   - Select Domestic/International SMS service
   - Go to "Signature Management" page and click "Add Signature"
   - Fill in signature information and submit for review
   - Wait for signature approval

3. Create a message template (template-code)
   - Go to "Template Management" page
   - Click "Add Template"
   - Create a template with the following format:

   ```text
   Monitor: ${instance}, Alert Level: ${priority}. Content: ${content}
   ```

   - Submit the template for review

4. Obtain Access Key credentials (access-key-id, access-key-secret)
   :::tip
   Alibaba Cloud officially recommends using RAM user AccessKey with minimal permissions.
   :::
   - [Go to RAM Access Control](https://ram.console.aliyun.com/users) to manage RAM users
   - Create user and select "Access Key for API Access"
   - Securely save the AccessKey ID and AccessKey Secret
   - Grant SMS service permission "AliyunDysmsFullAccess" to the user

Now you can configure this information in your hertzbeat application.

### UniSMS Configuration

UniSMS is an aggregated SMS service platform. You can refer to [UniSMS Documentation](https://unisms.apistd.com/docs/tutorials) for configuration.

Add/Fill in the following UniSMS configuration to `application.yml` (replace parameters with your own SMS server configuration):

```yaml
alerter:
  sms:
    enable: true    # Whether to enable
    type: unisms   # SMS provider type, set to unisms
    unisms:        # UniSMS configuration
       # auth-mode: simple or hmac
       auth-mode: simple
       access-key-id: YOUR_ACCESS_KEY_ID
       # hmac mode need to fill in access-key-secret
       access-key-secret: YOUR_ACCESS_KEY_SECRET
       signature: YOUR_SMS_SIGNATURE
       template-id: YOUR_TEMPLATE_ID
```

1. Register UniSMS account
   - Visit [UniSMS website](https://unisms.apistd.com/)

2. Create signature
   - Log in to [UniSMS Console](https://unisms.apistd.com/console/)
   - Go to "SMS Filing - Signature Management" page
   - Click "Add Signature"
   - Fill in signature information and submit for review
   - Wait for signature approval

3. Create message template
   - Go to "SMS Filing - Template Management" page
   - Click "Add Template"
   - Create a template with the following format:

   ```text
   Monitor: {instance}, Alert Level: {priority}. Content: {content}
   ```

   - Submit the template for review

4. Obtain `access-key-id` and `access-key-secret`
   - Log in to [UniSMS Console](https://unisms.apistd.com/console/)
   - Go to "Credential Management" page
   - Get AccessKey ID and AccessKey Secret
   - Securely save the AccessKey ID and AccessKey Secret

   :::note
   UniSMS provides two authentication methods for developers to choose from, which can be set in Console - Credential Management, with Simple Mode as default.
     - Simple Mode [Default]: This mode only verifies AccessKey ID without request parameter signature, making it easier for developers to integrate quickly.
     - HMAC Mode: This mode requires signing request parameters with AccessKey Secret to enhance the security and authenticity of requests.
   :::

Now you can configure this information in your hertzbeat application.

### Smslocal SMS Configuration

SMSLocal is an all-in-one SMS service for businesses, with features like multi-way sending, strong security, and 24/7 support. You can refer to smslocal's [Developer Documentation](https://www.smslocal.com/developer/) for configuration.

Add/Fill in the following Smslocal configuration to `application.yml` (replace parameters with your own SMS server configuration):

```yaml
alerter:
  sms:
    enable: true    # Whether to enable
    type: smslocal   # SMS provider type, set to smslocal
    smslocal:        # Smslocal configuration
       api-key: YOUR_API_KEY_HERE
```

1. Register smslocal account
   - Visit [Smslocal Website](https://www.smslocal.com/)

2. Obtain `api-key`
   - Log in to [Smslocal Api Access](https://secure.smslocal.com/cpaas/pages/profile/settings/api-reference)
   - Go to "API Access" page
   - Click the eye button
   - Copy the displayed access key
   - Then you can configure the `application.yml` file

Now you can configure this information in your hertzbeat application.

## Operation steps

1. **【Alarm notification】->【Add new recipient】 ->【Select SMS notification method】**

2. **Configure the associated alarm notification strategy⚠️ 【Add new notification strategy】-> 【Associate the recipient just set】-> 【Confirm】**

   > **Note⚠️ Adding a new recipient does not mean that it is effective to receive alarm information. It is also necessary to configure the associated alarm notification strategy, that is, to specify which messages are sent to which recipients.**

If you have any issues, please provide feedback through the communication group or ISSUE!
