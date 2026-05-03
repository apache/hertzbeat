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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.core.spi.FilterReply;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

/**
 * Unit tests for HertzBeat-native self log correlation attributes.
 */
class HertzBeatLogCorrelationTurboFilterTest {

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    @Test
    void injectsHertzBeatCorrelationAttributesForSelfMonitoringLogs() {
        HertzBeatLogCorrelationTurboFilter filter = new HertzBeatLogCorrelationTurboFilter();
        Logger logger = (Logger) LoggerFactory.getLogger(getClass());

        FilterReply reply = filter.decide(null, logger, Level.INFO, "collect success {}", new Object[] {155}, null);

        assertEquals(FilterReply.NEUTRAL, reply);
        String eventId = MDC.get("hertzbeat.event_id");
        String ingestId = MDC.get("hertzbeat.ingest_id");
        assertNotNull(eventId);
        assertTrue(eventId.matches("[0-9a-f]{32}"));
        assertEquals(eventId, MDC.get("log.record.uid"));
        assertNotNull(ingestId);
        assertTrue(ingestId.matches("[0-9a-f\\-]{36}"));
    }

    @Test
    void refreshesEventIdPerLogEventAndKeepsProcessIngestId() {
        HertzBeatLogCorrelationTurboFilter filter = new HertzBeatLogCorrelationTurboFilter();
        Logger logger = (Logger) LoggerFactory.getLogger(getClass());

        filter.decide(null, logger, Level.INFO, "first", null, null);
        String firstEventId = MDC.get("hertzbeat.event_id");
        String firstIngestId = MDC.get("hertzbeat.ingest_id");

        filter.decide(null, logger, Level.INFO, "second", null, null);

        assertNotEquals(firstEventId, MDC.get("hertzbeat.event_id"));
        assertEquals(firstIngestId, MDC.get("hertzbeat.ingest_id"));
        assertEquals(MDC.get("hertzbeat.event_id"), MDC.get("log.record.uid"));
    }

    @Test
    void registersTheFilterBeforeTheOpenTelemetryAppender() throws IOException {
        String logback = new String(
                getClass().getResourceAsStream("/logback-spring.xml").readAllBytes(),
                StandardCharsets.UTF_8);

        assertTrue(logback.contains(
                "<turboFilter class=\"org.apache.hertzbeat.startup.logging.HertzBeatLogCorrelationTurboFilter\"/>"));
        assertTrue(logback.indexOf("HertzBeatLogCorrelationTurboFilter")
                < logback.indexOf("<appender name=\"OpenTelemetryAppender\""));
    }

    @Test
    void capturesMdcAttributesWithTheAppenderScalarSetter() throws IOException {
        String logback = new String(
                getClass().getResourceAsStream("/logback-spring.xml").readAllBytes(),
                StandardCharsets.UTF_8);

        assertTrue(logback.contains("<captureMdcAttributes>*</captureMdcAttributes>"));
        assertTrue(!logback.contains("<captureMdcAttributes>.*</captureMdcAttributes>"));
        assertTrue(!logback.contains("<captureMdcAttributes>\n            <pattern>"));
    }

    @Test
    void disablesTheStarterManagedLogbackAppenderSoSelfLogsHaveOneConfiguredOtelPath() throws IOException {
        String application = new String(
                getClass().getResourceAsStream("/application.yml").readAllBytes(),
                StandardCharsets.UTF_8);

        assertTrue(application.contains("logback-appender:"));
        assertTrue(application.contains("enabled: false"));
    }
}
