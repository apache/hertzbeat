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

package org.apache.hertzbeat.manager.maintenance;

import java.time.Duration;
import java.util.concurrent.TimeoutException;
import org.apache.hertzbeat.alert.calculate.periodic.PeriodicAlertRuleScheduler;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.reduce.AlarmGroupReduce;
import org.apache.hertzbeat.common.runtime.ConditionalOnNormalBusinessRuntime;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/** Sequential cut across alert producers whose downstream path writes management metadata. */
@Component
@ConditionalOnNormalBusinessRuntime
@Order(400)
public final class AlertMetadataMaintenanceParticipant implements MetadataMaintenanceParticipant {

    private final PeriodicAlertRuleScheduler periodicScheduler;
    private final AlarmCommonReduce commonReduce;
    private final AlarmGroupReduce groupReduce;
    private MetadataMaintenancePhase phase = MetadataMaintenancePhase.RUNNING;
    private boolean periodicPaused;
    private boolean commonPaused;
    private boolean groupPaused;

    public AlertMetadataMaintenanceParticipant(
            PeriodicAlertRuleScheduler periodicScheduler,
            AlarmCommonReduce commonReduce,
            AlarmGroupReduce groupReduce) {
        this.periodicScheduler = periodicScheduler;
        this.commonReduce = commonReduce;
        this.groupReduce = groupReduce;
    }

    @Override
    public String participantId() {
        return "alert-control-metadata";
    }

    @Override
    public synchronized void quiesce(Duration timeout) {
        if (phase == MetadataMaintenancePhase.QUIESCED) {
            return;
        }
        MaintenanceDeadline deadline = MaintenanceDeadline.start(timeout);
        phase = MetadataMaintenancePhase.QUIESCING;
        try {
            periodicScheduler.pauseAdmission();
            periodicPaused = true;
            periodicScheduler.awaitDrained(deadline.remainingNanos());
            commonReduce.pauseAdmission();
            commonPaused = true;
            commonReduce.awaitDrained(deadline.remainingNanos());
            groupReduce.pauseAdmission();
            groupPaused = true;
            groupReduce.awaitDrained(deadline.remainingNanos());
            phase = MetadataMaintenancePhase.QUIESCED;
        } catch (InterruptedException exception) {
            resumePausedStages();
            Thread.currentThread().interrupt();
            throw MetadataMaintenanceException.quiesceInterrupted();
        } catch (TimeoutException exception) {
            resumePausedStages();
            throw MetadataMaintenanceException.quiesceTimeout();
        } catch (RuntimeException exception) {
            resumePausedStages();
            throw MetadataMaintenanceException.participantFailure();
        }
    }

    @Override
    public synchronized void resume() {
        if (phase == MetadataMaintenancePhase.RUNNING) {
            return;
        }
        if (!resumePausedStages()) {
            throw MetadataMaintenanceException.resumeFailure();
        }
    }

    private boolean resumePausedStages() {
        boolean resumed = true;
        if (groupPaused) {
            try {
                groupReduce.resumeAdmission();
                groupPaused = false;
            } catch (RuntimeException exception) {
                resumed = false;
            }
        }
        if (commonPaused) {
            try {
                commonReduce.resumeAdmission();
                commonPaused = false;
            } catch (RuntimeException exception) {
                resumed = false;
            }
        }
        if (periodicPaused) {
            try {
                periodicScheduler.resumeAdmission();
                periodicPaused = false;
            } catch (RuntimeException exception) {
                resumed = false;
            }
        }
        phase = resumed ? MetadataMaintenancePhase.RUNNING : MetadataMaintenancePhase.RECOVERY_REQUIRED;
        return resumed;
    }
}
