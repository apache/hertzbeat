package org.apache.hertzbeat.common.service;

import com.aliyun.dysmsapi20170525.models.SendSmsResponse;
import com.tencentcloudapi.common.Credential;
import com.tencentcloudapi.sms.v20210111.SmsClient;
import com.tencentcloudapi.sms.v20210111.models.SendSmsRequest;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.config.CommonProperties;
import org.apache.hertzbeat.common.support.exception.SendMessageException;
import org.apache.hertzbeat.common.util.AliYunSendSMS;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * sms service client for tencent cloud
 * @author lwq
 */
@Component
@ConditionalOnProperty("common.sms.aliyun.app-id")
@Slf4j
public class AliYunSmsClient {

    private static final String RESPONSE_OK = "OK";
    private static final String REGION = "ap-guangzhou";

    private SmsClient smsClient;
    private String appId;
    private String signName;
    private String templateId;
    private String secretId;
    private String secretKey;

    public AliYunSmsClient(CommonProperties properties) {
        if (properties == null || properties.getSms() == null || properties.getSms().getTencent() == null) {
            log.error("init error, please config TencentSmsClient props in application.yml");
            throw new IllegalArgumentException("please config TencentSmsClient props");
        }
        initSmsClient(properties.getSms().getAliYun());
    }

    private void initSmsClient(CommonProperties.AliYunSmsProperties tencent) {
        this.appId = tencent.getAppId();
        this.signName = tencent.getSignName();
        this.templateId = tencent.getTemplateId();
        this.secretId = tencent.getSecretId();
        this.secretKey = tencent.getSecretKey();
        Credential cred = new Credential(tencent.getSecretId(), tencent.getSecretKey());
        smsClient = new SmsClient(cred, REGION);
    }

    /**
     * 阿里云发送短信
     * @param appId appId
     * @param signName sign name
     * @param templateId template id
     * @param templateValues template values
     * @param phones phones num
     * @return true when send success
     */
    public void sendMessage(String appId, String signName, String templateId,String secretId,String  secretKey,
                            String[] templateValues, String[] phones){
        LocalDateTime dateTime = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        SendSmsRequest req = new SendSmsRequest();
        req.setSmsSdkAppId(appId);
        req.setSignName(signName);
        req.setTemplateId(templateId);
        req.setTemplateParamSet(templateValues);
        req.setPhoneNumberSet(phones);
        try {
            Map<String, Object> param = new HashMap<>();
            //监控名称、告警级别、告警信息、系统时间
            param.put("taskName", templateValues[0]);
            param.put("alert", templateValues[1]);
            param.put("message", templateValues[2]);
            param.put("sysTime",dateTime.format(formatter) );
            SendSmsResponse smsResponse = AliYunSendSMS.send(param, signName, templateId, phones[0], secretId, secretKey);
            String code = smsResponse.body.code;
            if (!RESPONSE_OK.equals(code)) {
                throw new SendMessageException(code + ":" + smsResponse.body.message);
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
        sendMessage(this.appId, this.signName, this.templateId,this.secretId,this.secretKey,templateValues, phones);
    }


}
