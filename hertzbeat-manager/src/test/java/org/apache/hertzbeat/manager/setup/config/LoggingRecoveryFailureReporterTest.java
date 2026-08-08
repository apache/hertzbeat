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

package org.apache.hertzbeat.manager.setup.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.io.IOException;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class LoggingRecoveryFailureReporterTest {

    @Test
    void logsFixedStageStoreContextAndSafeDiagnosticThrowable() {
        Logger logger = (Logger) LoggerFactory.getLogger(LoggingRecoveryFailureReporter.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            IOException failure = new IOException("password=secret jdbc:postgresql://private/path");
            new LoggingRecoveryFailureReporter().report(
                    RecoveryFailureReporter.Stage.PROMOTE_CANDIDATE,
                    RecoveryFailureReporter.Store.SECRET,
                    failure);

            assertEquals(1, appender.list.size());
            ILoggingEvent event = appender.list.getFirst();
            assertEquals(Level.WARN, event.getLevel());
            assertEquals("Managed configuration recovery failure stage=PROMOTE_CANDIDATE store=SECRET "
                            + "exception=java.io.IOException",
                    event.getFormattedMessage());
            assertFalse(event.getFormattedMessage().contains("password"));
            assertFalse(event.getFormattedMessage().contains("jdbc"));
            assertNotNull(event.getThrowableProxy());
            assertEquals(Throwable.class.getName(), event.getThrowableProxy().getClassName());
            assertNull(event.getThrowableProxy().getMessage());
            assertNull(event.getThrowableProxy().getCause());
            assertTrue(event.getThrowableProxy().getStackTraceElementProxyArray().length > 0);
            assertEquals(failure.getStackTrace()[0],
                    event.getThrowableProxy().getStackTraceElementProxyArray()[0].getStackTraceElement());
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
