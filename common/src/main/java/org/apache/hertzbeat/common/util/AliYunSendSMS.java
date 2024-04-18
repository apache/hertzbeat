package org.apache.hertzbeat.common.util;

import com.aliyun.dysmsapi20170525.models.SendSmsRequest;
import com.aliyun.dysmsapi20170525.models.SendSmsResponse;
import com.aliyun.teaopenapi.models.Config;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Map;

public class AliYunSendSMS {

    public static  com.aliyun.dysmsapi20170525.Client createClient(String accessKeyId, String accessKeySecret) throws Exception {
        Config config = new Config();
        config.accessKeyId = accessKeyId;
        config.accessKeySecret = accessKeySecret;
        return new com.aliyun.dysmsapi20170525.Client(config);
    }
    /**
     * 发送短信方法，入参map格式
     * @param map
     * @return
     * @throws Exception
     */
    public static SendSmsResponse send(Map<String, Object> map,String singName,String templateCode , String phone,String accessKeyId,String accessKeySecret) throws Exception {
        com.aliyun.dysmsapi20170525.Client client = AliYunSendSMS.createClient(accessKeyId, accessKeySecret);
        // 1.发送短信
        SendSmsRequest sendReq = new SendSmsRequest()
                .setPhoneNumbers(phone)//接收短信的手机号码
                .setSignName(singName)//短信签名
                .setTemplateCode(templateCode)//短信模板Code
                .setTemplateParam(new ObjectMapper().writeValueAsString(map));//短信模板变量对应的实际值
        SendSmsResponse sendResp = client.sendSms(sendReq);
        return sendResp;

    }
}