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

package org.apache.hertzbeat.manager.component.migration;

import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.manager.dao.MonitorDao;
import org.apache.hertzbeat.manager.dao.ParamDao;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Keeps pre-pinning SFTP monitors available until operators configure a trusted
 * host key. New monitors do not pass through this one-time compatibility path.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SftpHostKeyCompatibilityMigration implements CommandLineRunner {

    private static final String FTP_APP = "ftp";
    private static final String SFTP_FIELD = "ssl";
    private static final String HOST_KEY_FIELD = "hostKeyFingerprint";
    private static final String INSECURE_FIELD = "insecureSkipVerify";

    private final MonitorDao monitorDao;
    private final ParamDao paramDao;

    @Override
    @Transactional
    public void run(String... args) {
        int migratedMonitorCount = 0;
        for (Monitor monitor : monitorDao.findMonitorsByAppEquals(FTP_APP)) {
            List<Param> params = paramDao.findParamsByMonitorId(monitor.getId());
            if (isEnabledSftp(params) && hasNoHostKeyPolicy(params)) {
                paramDao.save(Param.builder()
                        .monitorId(monitor.getId())
                        .field(INSECURE_FIELD)
                        .paramValue(Boolean.TRUE.toString())
                        .type(CommonConstants.TYPE_STRING)
                        .build());
                migratedMonitorCount++;
            }
        }
        if (migratedMonitorCount > 0) {
            log.warn("Enabled temporary SFTP host-key compatibility for {} existing monitor(s). "
                            + "Verify and pin the server fingerprints, then disable the unsafe option.",
                    migratedMonitorCount);
        }
    }

    private boolean isEnabledSftp(List<Param> params) {
        return params.stream()
                .anyMatch(param -> SFTP_FIELD.equals(param.getField())
                        && Boolean.parseBoolean(param.getParamValue()));
    }

    private boolean hasNoHostKeyPolicy(List<Param> params) {
        return params.stream()
                .noneMatch(param -> HOST_KEY_FIELD.equals(param.getField())
                        || INSECURE_FIELD.equals(param.getField()));
    }
}
