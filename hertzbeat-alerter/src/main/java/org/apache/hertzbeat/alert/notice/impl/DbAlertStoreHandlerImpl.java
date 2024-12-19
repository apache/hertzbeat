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

package org.apache.hertzbeat.alert.notice.impl;

import java.util.LinkedList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.alert.dao.GroupAlertDao;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.notice.AlertStoreHandler;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.springframework.stereotype.Component;

/**
 * Alarm data persistence - landing in the database
 */
@Component
@RequiredArgsConstructor
@Slf4j
final class DbAlertStoreHandlerImpl implements AlertStoreHandler {

    private final GroupAlertDao groupAlertDao;
    
    private final SingleAlertDao singleAlertDao;

    @Override
    public void store(GroupAlert groupAlert) {
        // Alarm store db
        List<String> alertFingerprints = new LinkedList<>();
        groupAlert.getAlerts().forEach(singleAlert -> {
            alertFingerprints.add(singleAlert.getFingerprint());
            singleAlertDao.save(singleAlert);
        });
        groupAlert.setAlertFingerprints(alertFingerprints);
        groupAlertDao.save(groupAlert);
    }
}
