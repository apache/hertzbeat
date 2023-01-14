package com.usthe.common.service;

import com.tencentcloudapi.common.Credential;
import com.tencentcloudapi.sms.v20210111.SmsClient;
import com.tencentcloudapi.sms.v20210111.models.SendSmsRequest;
import com.tencentcloudapi.sms.v20210111.models.SendSmsResponse;
import com.tencentcloudapi.sms.v20210111.models.SendStatus;
import com.usthe.common.config.CommonProperties;
import com.usthe.common.support.exception.SendMessageException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * sms service client for tencent cloud
 * @author tom
 * @date 2022/12/17 17:41
 */
@Component
@ConditionalOnProperty("common.sms.tencent.app-id")
@Slf4j
public class TencentSmsClient {

    private static final String RESPONSE_OK = "Ok";
    private static final String REGION = "ap-guangzhou";

    private SmsClient smsClient;
    private String appId;
    private String signName;
    private String templateId;

    public TencentSmsClient(CommonProperties properties) {
        if (properties == null || properties.getSms() == null || properties.getSms().getTencent() == null) {
            log.error("init error, please config TencentSmsClient props in application.yml");
            throw new IllegalArgumentException("please config TencentSmsClient props");
        }
        initSmsClient(properties.getSms().getTencent());
    }

    private void initSmsClient(CommonProperties.TencentSmsProperties tencent) {
        this.appId = tencent.getAppId();
        this.signName = tencent.getSignName();
        this.templateId = tencent.getTemplateId();
        Credential cred = new Credential(tencent.getSecretId(), tencent.getSecretKey());
        smsClient = new SmsClient(cred, REGION);
    }

    /**
     * 发送短信
     * @param appId appId
     * @param signName sign name
     * @param templateId template id
     * @param templateValues template values
     * @param phones phones num
     * @return true when send success
     */
    public void sendMessage(String appId, String signName, String templateId,
                            String[] templateValues, String[] phones) {
        SendSmsRequest req = new SendSmsRequest();
        req.setSmsSdkAppId(appId);
        req.setSignName(signName);
        req.setTemplateId(templateId);
        req.setTemplateParamSet(templateValues);
        req.setPhoneNumberSet(phones);
        try {
            SendSmsResponse smsResponse = this.smsClient.SendSms(req);
            SendStatus sendStatus = smsResponse.getSendStatusSet()[0];
            if (!RESPONSE_OK.equals(sendStatus.getCode())) {
                throw new SendMessageException(sendStatus.getCode() + ":" + sendStatus.getMessage());
            }
        } catch (Exception e) {
            log.warn(e.getMessage());
            throw new SendMessageException(e.getMessage());
        }
    }

    /**
     * 发送短信
     * @param templateValues template values
     * @param phones phones num
     * @return true when send success
     */
    public void sendMessage(String[] templateValues, String[] phones) {
        sendMessage(this.appId, this.signName, this.templateId, templateValues, phones);
    }


}
