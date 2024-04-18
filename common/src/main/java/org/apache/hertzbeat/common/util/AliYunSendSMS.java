/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
     * Method for sending SMS messages: Enter the map format
     * @param map
     * @return
     * @throws Exception
     */
    public static SendSmsResponse send(Map<String, Object> map,String singName,String templateCode , String phone,String accessKeyId,String accessKeySecret) throws Exception {
        com.aliyun.dysmsapi20170525.Client client = AliYunSendSMS.createClient(accessKeyId, accessKeySecret);
        // 1.Send a text message
        SendSmsRequest sendReq = new SendSmsRequest()
                .setPhoneNumbers(phone)//The phone number that received the text message
                .setSignName(singName)//SMS signature
                .setTemplateCode(templateCode)//SMS Template Code
                .setTemplateParam(new ObjectMapper().writeValueAsString(map));//The actual value of the SMS template variable
        SendSmsResponse sendResp = client.sendSms(sendReq);
        return sendResp;

    }
}