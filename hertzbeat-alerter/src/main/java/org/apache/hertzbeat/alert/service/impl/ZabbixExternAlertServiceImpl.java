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

package org.apache.hertzbeat.alert.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.ExternAlertService;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * zabbix external alarm service impl
 */
@Slf4j
@Service
public class ZabbixExternAlertServiceImpl implements ExternAlertService {

    @Autowired
    private AlarmCommonReduce alarmCommonReduce;

    @Override
    public void addExternAlert(String content) {
        SingleAlert alert = JsonUtil.fromJson(content, SingleAlert.class);
        if (alert == null) {
            log.warn("parse extern alert content failed! content: {}", content);
            return;
        }
        alarmCommonReduce.reduceAndSendAlarm(alert);
    }

    @Override
    public String supportSource() {
        return "zabbix";
    }
}
