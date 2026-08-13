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
import static org.junit.jupiter.api.Assertions.assertNull;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.io.IOException;
import java.util.Arrays;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class LoggingRecoveryFailureReporterTest {

    @Test
    void logsOnlyFixedStageStoreAndExceptionClass() {
        Logger logger = (Logger) LoggerFactory.getLogger(LoggingRecoveryFailureReporter.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            String password = "password=stack-secret";
            String jdbcUrl = "jdbc:postgresql://private/database";
            String cliSecret = "--token=cli-secret";
            IOException failure = new IOException("message-secret");
            failure.setStackTrace(new StackTraceElement[] {new StackTraceElement(
                    password, jdbcUrl, cliSecret, "1.0", password, jdbcUrl, 17)});
            failure.addSuppressed(new IOException(cliSecret));
            failure.initCause(new IOException(jdbcUrl));
            RecoveryFailureReporter.reportSafely(new LoggingRecoveryFailureReporter(),
                    RecoveryFailureReporter.Stage.PROMOTE_CANDIDATE,
                    RecoveryFailureReporter.Store.SECRET,
                    failure);

            assertEquals(1, appender.list.size());
            ILoggingEvent event = appender.list.getFirst();
            assertEquals(Level.WARN, event.getLevel());
            assertEquals("Managed configuration recovery failure stage=PROMOTE_CANDIDATE store=SECRET "
                            + "exception=java.io.IOException",
                    event.getFormattedMessage());
            assertNull(event.getThrowableProxy());
            String arguments = Arrays.toString(event.getArgumentArray());
            for (String secret : new String[] {password, jdbcUrl, cliSecret, "message-secret"}) {
                assertFalse(event.getFormattedMessage().contains(secret));
                assertFalse(arguments.contains(secret));
            }
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    @Test
    void customAdapterReceivesOnlyTheExceptionClass() {
        AtomicReference<RecoveryFailureReporter.Stage> capturedStage = new AtomicReference<>();
        AtomicReference<RecoveryFailureReporter.Store> capturedStore = new AtomicReference<>();
        AtomicReference<String> capturedExceptionClass = new AtomicReference<>();
        RecoveryFailureReporter adapter = (stage, store, exceptionClass) -> {
            capturedStage.set(stage);
            capturedStore.set(store);
            capturedExceptionClass.set(exceptionClass);
        };

        RecoveryFailureReporter.reportSafely(adapter,
                RecoveryFailureReporter.Stage.RESTORE_ACTIVE,
                RecoveryFailureReporter.Store.APPLICATION,
                new IOException("raw failure must stay behind boundary"));

        assertEquals(RecoveryFailureReporter.Stage.RESTORE_ACTIVE, capturedStage.get());
        assertEquals(RecoveryFailureReporter.Store.APPLICATION, capturedStore.get());
        assertEquals(IOException.class.getName(), capturedExceptionClass.get());
    }
}
