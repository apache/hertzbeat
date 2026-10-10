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

package org.apache.hertzbeat.startup.logging;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.turbo.TurboFilter;
import ch.qos.logback.core.spi.FilterReply;
import java.util.UUID;
import org.slf4j.MDC;
import org.slf4j.Marker;

/**
 * Adds HertzBeat-native correlation attributes before the OpenTelemetry Logback appender snapshots MDC.
 */
public class HertzBeatLogCorrelationTurboFilter extends TurboFilter {

    static final String EVENT_ID_ATTRIBUTE = "hertzbeat.event_id";
    static final String LOG_RECORD_UID_ATTRIBUTE = "log.record.uid";
    static final String INGEST_ID_ATTRIBUTE = "hertzbeat.ingest_id";

    private static final String PROCESS_INGEST_ID = UUID.randomUUID().toString();

    @Override
    public FilterReply decide(Marker marker, Logger logger, Level level, String format, Object[] params, Throwable t) {
        String eventId = UUID.randomUUID().toString().replace("-", "");
        MDC.put(EVENT_ID_ATTRIBUTE, eventId);
        MDC.put(LOG_RECORD_UID_ATTRIBUTE, eventId);
        MDC.put(INGEST_ID_ATTRIBUTE, PROCESS_INGEST_ID);
        return FilterReply.NEUTRAL;
    }
}
