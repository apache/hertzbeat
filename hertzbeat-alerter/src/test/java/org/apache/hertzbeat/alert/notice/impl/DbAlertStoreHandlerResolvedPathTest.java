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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.alert.dao.GroupAlertDao;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.notice.AlertStoreHandler;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.GroupAlert;
import org.apache.hertzbeat.common.entity.alerter.SingleAlert;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Real H2 proof of the resolved-group refresh path: a member recovery must not resolve a
 * group whose other members are still firing, and workspace scoping must keep fingerprints
 * from different workspaces apart.
 */
@DataJpaTest(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.flyway.enabled=false"
})
@EntityScan(basePackages = "org.apache.hertzbeat.common.entity")
@EnableJpaRepositories(basePackageClasses = {SingleAlertDao.class, GroupAlertDao.class})
@Import({DbAlertStoreHandlerImpl.class, DbAlertStoreTransaction.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class DbAlertStoreHandlerResolvedPathTest {

    private static final String GROUP_KEY = "instance:host1";

    private static final String CPU_FINGERPRINT = "cpu";

    private static final String MEMORY_FINGERPRINT = "memory";

    @Autowired
    private AlertStoreHandler storeHandler;

    @Autowired
    private SingleAlertDao singleAlertDao;

    @Autowired
    private GroupAlertDao groupAlertDao;

    @BeforeEach
    void cleanDatabase() {
        groupAlertDao.deleteAll();
        singleAlertDao.deleteAll();
    }

    @Test
    void oneMemberRecoveryKeepsGroupFiringAndLastRecoveryResolvesIt() {
        storeHandler.store(group("team-a", CommonConstants.ALERT_STATUS_FIRING,
                alert("team-a", CPU_FINGERPRINT, CommonConstants.ALERT_STATUS_FIRING),
                alert("team-a", MEMORY_FINGERPRINT, CommonConstants.ALERT_STATUS_FIRING)));

        GroupAlert firstRecovery = storeHandler.store(group("team-a", CommonConstants.ALERT_STATUS_RESOLVED,
                alert("team-a", CPU_FINGERPRINT, CommonConstants.ALERT_STATUS_RESOLVED)));

        assertEquals(CommonConstants.ALERT_STATUS_FIRING, firstRecovery.getStatus(),
                "a single member recovery must not resolve the returned group");
        assertEquals(2, firstRecovery.getAlerts().size(),
                "the returned payload must still carry both persisted members");
        assertMember(firstRecovery, CPU_FINGERPRINT, CommonConstants.ALERT_STATUS_RESOLVED);
        assertMember(firstRecovery, MEMORY_FINGERPRINT, CommonConstants.ALERT_STATUS_FIRING);
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, storedGroup("team-a").getStatus(),
                "the persisted group must stay firing while one member still fires");
        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED,
                singleAlert("team-a", CPU_FINGERPRINT).getStatus());

        GroupAlert lastRecovery = storeHandler.store(group("team-a", CommonConstants.ALERT_STATUS_RESOLVED,
                alert("team-a", MEMORY_FINGERPRINT, CommonConstants.ALERT_STATUS_RESOLVED)));

        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED, lastRecovery.getStatus(),
                "the last member recovery must resolve the returned group");
        assertEquals(2, lastRecovery.getAlerts().size());
        assertMember(lastRecovery, CPU_FINGERPRINT, CommonConstants.ALERT_STATUS_RESOLVED);
        assertMember(lastRecovery, MEMORY_FINGERPRINT, CommonConstants.ALERT_STATUS_RESOLVED);
        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED, storedGroup("team-a").getStatus());
        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED,
                singleAlert("team-a", CPU_FINGERPRINT).getStatus());
        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED,
                singleAlert("team-a", MEMORY_FINGERPRINT).getStatus());
    }

    @Test
    void firingFingerprintInAnotherWorkspaceDoesNotBlockResolution() {
        storeHandler.store(group("team-b", CommonConstants.ALERT_STATUS_FIRING,
                alert("team-b", CPU_FINGERPRINT, CommonConstants.ALERT_STATUS_FIRING)));
        storeHandler.store(group("team-a", CommonConstants.ALERT_STATUS_FIRING,
                alert("team-a", CPU_FINGERPRINT, CommonConstants.ALERT_STATUS_FIRING)));

        GroupAlert recovered = storeHandler.store(group("team-a", CommonConstants.ALERT_STATUS_RESOLVED,
                alert("team-a", CPU_FINGERPRINT, CommonConstants.ALERT_STATUS_RESOLVED)));

        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED, recovered.getStatus());
        assertEquals(1, recovered.getAlerts().size());
        assertMember(recovered, CPU_FINGERPRINT, CommonConstants.ALERT_STATUS_RESOLVED);
        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED, storedGroup("team-a").getStatus());
        assertEquals(CommonConstants.ALERT_STATUS_RESOLVED,
                singleAlert("team-a", CPU_FINGERPRINT).getStatus());
        assertEquals(CommonConstants.ALERT_STATUS_FIRING, storedGroup("team-b").getStatus(),
                "the same fingerprint in another workspace must keep its own firing group");
        assertEquals(CommonConstants.ALERT_STATUS_FIRING,
                singleAlert("team-b", CPU_FINGERPRINT).getStatus());
    }

    private static void assertMember(GroupAlert groupAlert, String fingerprint, String status) {
        assertTrue(groupAlert.getAlerts().stream().anyMatch(alert ->
                        fingerprint.equals(alert.getFingerprint()) && status.equals(alert.getStatus())),
                "expected member " + fingerprint + " with status " + status
                        + " in payload " + describe(groupAlert));
    }

    private static String describe(GroupAlert groupAlert) {
        return groupAlert.getAlerts().stream()
                .map(alert -> alert.getFingerprint() + "=" + alert.getStatus())
                .toList()
                .toString();
    }

    private GroupAlert storedGroup(String workspaceId) {
        return groupAlertDao.findByWorkspaceIdAndGroupKey(workspaceId, GROUP_KEY);
    }

    private SingleAlert singleAlert(String workspaceId, String fingerprint) {
        return singleAlertDao.findByWorkspaceIdAndFingerprint(workspaceId, fingerprint);
    }

    private static GroupAlert group(String workspaceId, String status, SingleAlert... alerts) {
        return GroupAlert.builder()
                .workspaceId(workspaceId)
                .groupKey(GROUP_KEY)
                .groupLabels(Map.of("instance", "host1"))
                .status(status)
                .alerts(List.of(alerts))
                .build();
    }

    private static SingleAlert alert(String workspaceId, String fingerprint, String status) {
        return SingleAlert.builder()
                .workspaceId(workspaceId)
                .fingerprint(fingerprint)
                .status(status)
                .labels(Map.of("instance", "host1"))
                .startAt(1000L)
                .activeAt(2000L)
                .triggerTimes(1)
                .build();
    }

    @SpringBootConfiguration(proxyBeanMethods = false)
    static class TestConfiguration {
    }
}
