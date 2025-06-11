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

package org.apache.hertzbeat.alert.service;

import org.apache.hertzbeat.alert.dto.HuaweiCloudExternAlert;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.impl.HuaweiCloudExternAlertService;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * unit test for {@link AlibabaCloudSlsExternAlertServiceTest }
 */
@ExtendWith(MockitoExtension.class)
public class HuaweiCloudExternAlertServiceTest {

    @Mock
    private AlarmCommonReduce alarmCommonReduce;

    @InjectMocks
    private HuaweiCloudExternAlertService externAlertService;

    @BeforeEach
    void setUp() {
        assertEquals("huaweicloud-ces", externAlertService.supportSource());
    }

    @Test
    void testAddExternAlertWithInvalidContent() {
        String invalidContent = "invalid json";
        externAlertService.addExternAlert(invalidContent);
        verify(alarmCommonReduce, never()).reduceAndSendAlarm(any(SingleAlert.class));
    }

    @Test
    void testMessageValidFailed() {
        HuaweiCloudExternAlert externAlert = new HuaweiCloudExternAlert();
        externAlert.setMessageId("d3672d737bb742cf8c2aa3f0fd72d4d1");
        externAlert.setType("failedType");
        externAlert.setMessage("failedMessage");
        externAlert.setTimestamp("2025-06-07T15:12:09Z");
        externAlertService.addExternAlert(JsonUtil.toJson(externAlert));
        verify(alarmCommonReduce, never()).reduceAndSendAlarm(any(SingleAlert.class));
    }

    @Test
    void testCertFailed() {
        HuaweiCloudExternAlert externAlert = new HuaweiCloudExternAlert();
        externAlert.setSignature("TImrLoeb0tV1JZJSPyA0rpC9mNqH3MmhwQ4tgpuHHa+JztfGVZFvkU//OthKKhzpDAoYiXOYG9DbzXCLb"
                + "vaGePIRITakoynYyYr9zZIpdx9jXhQNlgF8np1+t0JxNeoIq0DYWgH52tsodwqOm+OnmkcHwCRo/1rFv85KrKAaX2gy3sNwX"
                + "w1hKnAwAw0mJlxHHSf/N3+7j6GoxCNV7fN9K4CpJiLMGNvUa7zVmG0U9mPvt/7Lac155kPPQ9lYyeL7vVI0e4sfRbuQruz3E"
                + "0ZP40TKx0afoeR0/Bx/IoZzRP1La7pKlbEISvkcM7TqW/IOGQTkhVsQ32RFRxZWO2snw==");
        externAlert.setSubject("[华为云][紧急告警恢复]云监控通知：分布式缓存服务-DCS Redis实例 “dcs-h4tv” 的每秒并发操作数已恢复正常。");
        externAlert.setTopicUrn("urn:smn:cn-north-4:477a784601d744e4ab9ab83986502d31:CES_notification_group_bngJ2aMpX");
        externAlert.setMessageId("d3672d737bb742cf8c2aa3f0fd72d4d1");
        externAlert.setType("Notification");
        externAlert.setMessage("{}");
        externAlert.setSigningCertUrl("https://smn.cn-north-4.myhuaweicloud.com/failedUrl");
        externAlert.setTimestamp("2025-06-07T15:12:09Z");
        externAlertService.addExternAlert(JsonUtil.toJson(externAlert));
        verify(alarmCommonReduce, never()).reduceAndSendAlarm(any(SingleAlert.class));
    }

    @Test
    void testAddExternAlert() {
        HuaweiCloudExternAlert externAlert = new HuaweiCloudExternAlert();
        externAlert.setSignature("Igs0bBhzw0JGmlgBH+9ejw2xWfPTXjAatAEsKDkkWcC5bZ/jveckdRZdgp/S0JER9eiJfMF427YDABufIN0sv/vBRXaRQKfRBLTJYbSTl+AQpEbIW5yUfJSRLEG3HNEhUDjASolbrW7zdPCoGkkqjifE23FCvw"
                + "+4tewMzqmHnfJHcFBq3W89CJzdPBjwO1UcY9C39moUZgqZk+qDVLpxb4bHSrEYAwPOSrOPR7TZpETJ30UOgFYajJydQk692edfs0NeVutHoQiOJ5/YC83ULHft0aXhichjtfZE4KF69nROAKez0ubk3l"
                + "Ey/mBIM9Ylbxn5b84OIrzzZQrIWe8Syw==");
        externAlert.setSubject("[华为云][紧急告警]云监控通知：分布式缓存服务-DCS Redis实例 “dcs-h4tv” 的每秒并发操作数已触发告警。");
        externAlert.setTopicUrn("urn:smn:cn-north-4:477a784601d744e4ab9ab83986502d31:CES_notification_group_bngJ2aMpX");
        externAlert.setMessageId("1565df032a19494590d61e05f7b0dc0e");
        externAlert.setType("Notification");
        externAlert.setMessage("{\"version\":\"v1\",\"data\":{\"AccountName\":\"hid_hk6tij5o1v-95zn\",\"Namespace\":\"分布式缓存服务\",\"DimensionName\":\"DCS Redis实例\",\"ResourceName\""
                + ":\"dcs-h4tv\",\"MetricName\":\"每秒并发操作数\",\"IsAlarm\":true,\"AlarmLevel\":\"紧急\",\"Region\":\"华东-上海一\",\"RegionId\":\"cn-east-3\",\"ResourceId\":\"3dc7b9ea"
                + "-70b4-4c38-942d-e2636e6d844c\",\"PrivateIp\":\"192.168.0.54\",\"CurrentData\":\"6.00 count\",\"AlarmTime\":\"2025/06/02 22:56:15 GMT+08:00\","
                + "\"AlarmRecordID\":\"ah1748876175242njvndyzMZ\","
                + "\"AlarmRuleName\":\"alarm-c5jj\",\"IsOriginalValue\":true,\"Filter\":\"原始值\",\"ComparisonOperator\":\"\\u003e\",\"Value\":\"5 count\",\"Unit\":\"count\",\"Count\":2}}");
        externAlert.setSigningCertUrl("https://smn.cn-north-4.myhuaweicloud.com/smn/SMN_cn-north-4_b98100ca131b4116ab8ee7ccedbaae99.pem");
        externAlert.setTimestamp("2025-06-02T14:56:17Z");
        externAlertService.addExternAlert(JsonUtil.toJson(externAlert));
        verify(alarmCommonReduce, times(1)).reduceAndSendAlarm(any(SingleAlert.class));
    }

    @Test
    void testSubscriptionUrl() {
        HuaweiCloudExternAlert externAlert = new HuaweiCloudExternAlert();
        externAlert.setSubscribeUrl("https://console.huaweicloud.com/smn/subscription/confirm?token=477a784601d744e4ab9ab83986502d31c4b938"
                + "0ec0b64392b134e517c3aa17eb7b3a12dc9f3b4ab495e61c4dee654b435d7223ea934345bf8ae8901cef912b1d&topic_urn=urn:smn:cn-north-4"
                + ":477a784601d744e4ab9ab83986502d31:CES_notification_group_bngJ2aMpX&region=cn-north-4");
        externAlert.setSignature("ottf37C/2RdDgqimRQMIBU6i7XjUfPPMU760jJn71wwP3825YPoIT22uw2A9399rkm9Jrt1qUEFrDLuA5yHFLd5n/XoM4FghIgyFn7VIfgpuVM31a+co78s"
                + "YBiZ1egOCE/AwFm2oygRhfIceUj9Kw9vmc06el9TXY6RtE5tAEF6qEmICtTh45KwtCO/WRs3DY72dQi5hm0w7/tktS4WFZ1iP4LHt5eCwFvnH0u29Y96cJNI0fLUQxI5MkhgjK"
                + "77JkFK7UT6ZYJZhzgSp/B7OQGStOQx+3Duvx4T4CzccZQM3sca81Z0B0GFGWeVXuEHyCPLsayY/Iz+5Tco51elT8w==");
        externAlert.setTopicUrn("urn:smn:cn-north-4:477a784601d744e4ab9ab83986502d31:CES_notification_group_bngJ2aMpX");
        externAlert.setMessageId("242fac183d3a4936b5ead6c725a32ed0");
        externAlert.setType("SubscriptionConfirmation");
        externAlert.setMessage("You are invited to subscribe to topic: urn:smn:cn-north-4:477a784601d744e4ab9ab83986502d31:"
                + "CES_notification_group_bngJ2aMpX. To confirm this subscription, please visit the subscribe_url included in this message. The subscribe_url is valid only within 48 hours.");
        externAlert.setSigningCertUrl("https://smn.cn-north-4.myhuaweicloud.com/smn/SMN_cn-north-4_b98100ca131b4116ab8ee7ccedbaae99.pem");
        externAlert.setTimestamp("2025-06-07T15:07:14Z");
        externAlertService.addExternAlert(JsonUtil.toJson(externAlert));
        verify(alarmCommonReduce, never()).reduceAndSendAlarm(any(SingleAlert.class));
    }

    @Test
    void testUnsubscribe() {
        HuaweiCloudExternAlert externAlert = new HuaweiCloudExternAlert();
        externAlert.setSignature("TImrLoeb0tV1JZJSPyA0rpC9mNqH3MmhwQ4tgpuHHa+JztfGVZFvkU//OthKKhzpDAoYiXOYG9DbzXCLbvaGePIRITakoynYyYr9zZIpdx9jXhQNlgF8np"
                + "1+t0JxNeoIq0DYWgH52tsodwqOm+OnmkcHwCRo/1rFv85KrKAaX2gy3sNwXw1hKnAwAw0mJlxHHSf/N3+7j6GoxCNV7fN9K4CpJiLMGNvUa7zVmG0U9mPvt/7Lac155kPPQ9l"
                + "YyeL7vVI0e4sfRbuQruz3E0+ZP40TKx0afoeR0/Bx/IoZzRP1La7pKlbEISvkcM7TqW/IOGQTkhVsQ32RFRxZWO2snw==");
        externAlert.setSubject("[华为云][紧急告警恢复]云监控通知：分布式缓存服务-DCS Redis实例 “dcs-h4tv” 的每秒并发操作数已恢复正常。");
        externAlert.setTopicUrn("urn:smn:cn-north-4:477a784601d744e4ab9ab83986502d31:CES_notification_group_bngJ2aMpX");
        externAlert.setMessageId("d3672d737bb742cf8c2aa3f0fd72d4d1");
        externAlert.setType("UnsubscribeConfirmation");
        externAlert.setMessage("{}");
        externAlert.setSigningCertUrl("https://smn.cn-north-4.myhuaweicloud.com/smn/SMN_cn-north-4_b98100ca131b4116ab8ee7ccedbaae99.pem");
        externAlert.setTimestamp("2025-06-07T15:12:09Z");
        externAlertService.addExternAlert(JsonUtil.toJson(externAlert));
        verify(alarmCommonReduce, never()).reduceAndSendAlarm(any(SingleAlert.class));
    }




}