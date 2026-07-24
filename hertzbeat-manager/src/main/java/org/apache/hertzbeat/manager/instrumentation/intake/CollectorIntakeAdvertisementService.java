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

package org.apache.hertzbeat.manager.instrumentation.intake;

import static org.apache.hertzbeat.common.constants.CommonConstants.COLLECTOR_STATUS_ONLINE;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.manager.Collector;
import org.apache.hertzbeat.common.support.exception.CommonException;
import org.apache.hertzbeat.manager.dao.CollectorDao;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.ErrorCode;
import org.apache.hertzbeat.manager.pojo.dto.CollectorInstrumentationIntake.Gateway;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Persists and maps explicit safe application-instrumentation intake advertisements. */
@Service
@Slf4j
public class CollectorIntakeAdvertisementService implements CollectorIntakeAdvertisementReader {

    private final CollectorDao collectorDao;
    private final CollectorIntakeAdvertisementCodec codec;

    public CollectorIntakeAdvertisementService(CollectorDao collectorDao, CollectorIntakeAdvertisementCodec codec) {
        this.collectorDao = collectorDao;
        this.codec = codec;
    }

    @Transactional(rollbackFor = Exception.class)
    public CollectorInstrumentationIntake update(String collectorName, CollectorIntakeAdvertisementRequest request) {
        Collector collector = requireCollector(collectorName);
        collector.setInstrumentationIntake(codec.encode(request));
        collectorDao.save(collector);
        return read(collector);
    }

    @Transactional(rollbackFor = Exception.class)
    public CollectorInstrumentationIntake clear(String collectorName) {
        Collector collector = requireCollector(collectorName);
        collector.setInstrumentationIntake(null);
        collectorDao.save(collector);
        return CollectorInstrumentationIntake.notAdvertised(collectorName);
    }

    @Override
    public CollectorInstrumentationIntake read(Collector collector) {
        String collectorId = collector.getName();
        if (StringUtils.isBlank(collector.getInstrumentationIntake())) {
            return CollectorInstrumentationIntake.notAdvertised(collectorId);
        }
        CollectorIntakeAdvertisementRequest request;
        try {
            request = codec.decode(collector.getInstrumentationIntake());
        } catch (CollectorIntakeAdvertisementException exception) {
            log.warn("Stored Collector instrumentation intake advertisement is invalid");
            return CollectorInstrumentationIntake.unavailable(
                    collectorId, ErrorCode.INTAKE_ADVERTISEMENT_INVALID);
        }
        if (request.gateway() == Gateway.COLLECTOR && collector.getStatus() != COLLECTOR_STATUS_ONLINE) {
            return CollectorInstrumentationIntake.unavailable(
                    collectorId, ErrorCode.INTAKE_ADVERTISEMENT_UNAVAILABLE);
        }
        return request.available(collectorId);
    }

    private Collector requireCollector(String collectorName) {
        return collectorDao.findCollectorByName(collectorName)
                .orElseThrow(() -> new CommonException("Collector not found: " + collectorName));
    }
}
