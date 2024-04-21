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

package org.apache.hertzbeat.manager.service;

import java.util.List;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dao.AlertDefineDao;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

/**
 * available alert define database record init
 */
@Service
@Order(value = Ordered.HIGHEST_PRECEDENCE + 1)
@Slf4j
public class AvailableAlertDefineInit implements CommandLineRunner {

    @Autowired
    private AlertDefineDao alertDefineDao;

    @Autowired
    private AppService appService;

    @Override
    public void run(String... args) throws Exception {
        Set<String> apps = appService.getAllAppDefines().keySet();
        for (String app : apps) {
            try {
                List<AlertDefine> defines = alertDefineDao.queryAlertDefineByAppAndMetric(app, CommonConstants.AVAILABILITY);
                if (defines.isEmpty()) {
                    AlertDefine alertDefine = AlertDefine.builder()
                            .app(app)
                            .metric(CommonConstants.AVAILABILITY)
                            .preset(true)
                            .times(2)
                            .enable(true)
                            .recoverNotice(false)
                            .priority(CommonConstants.ALERT_PRIORITY_CODE_EMERGENCY)
                            .template("${app} monitoring availability alert, code is ${code}")
                            .build();
                    alertDefineDao.save(alertDefine);
                }
            } catch (Exception e) {
                log.error(e.getMessage(), e);
            }
        }
    }
}
