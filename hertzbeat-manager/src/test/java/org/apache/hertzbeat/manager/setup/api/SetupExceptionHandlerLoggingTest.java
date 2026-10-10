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

package org.apache.hertzbeat.manager.setup.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Arrays;
import org.apache.hertzbeat.common.transaction.MetadataWriteAdmissionException;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;
import org.apache.hertzbeat.manager.setup.runtime.SetupResponseTransition;
import org.apache.hertzbeat.manager.setup.security.SetupHttpUnlockService;
import org.apache.hertzbeat.manager.setup.workflow.SetupExportRenderer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class SetupExceptionHandlerLoggingTest {
    private final SetupWorkflow workflow = mock(SetupWorkflow.class);
    private final Logger logger = (Logger) LoggerFactory.getLogger(SetupExceptionHandler.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        appender.start();
        logger.addAppender(appender);
        mvc = MockMvcBuilders.standaloneSetup(new SetupController(workflow,
                        mock(SetupHttpUnlockService.class), mock(SetupResponseTransition.class),
                        new SetupExportRenderer()))
                .setControllerAdvice(new SetupExceptionHandler()).build();
    }

    @AfterEach
    void tearDown() {
        logger.detachAppender(appender);
        appender.stop();
    }

    @Test
    void unexpectedFailureLogsOnlyFixedContextWhileResponseStaysSafe() throws Exception {
        String password = "password=stack-secret";
        String jdbcUrl = "jdbc:postgresql://private/database";
        String cliSecret = "--token=cli-secret";
        IllegalStateException failure = new IllegalStateException("exception-secret");
        failure.setStackTrace(new StackTraceElement[] {new StackTraceElement(
                password, jdbcUrl, cliSecret, "1.0", password, jdbcUrl, 17)});
        failure.addSuppressed(new IllegalArgumentException(cliSecret));
        failure.initCause(new IllegalArgumentException(jdbcUrl));
        when(workflow.status()).thenThrow(failure);

        mvc.perform(get(SetupApiContract.STATUS_PATH).queryParam("token", "query-secret"))
                .andExpect(status().isInternalServerError())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.errorCode").value("internal_error"))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("exception-secret"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("query-secret"))));

        var errors = appender.list.stream().filter(event -> event.getLevel() == Level.ERROR).toList();
        assertEquals(1, errors.size());
        ILoggingEvent event = errors.getFirst();
        assertEquals("Unexpected setup request failure exception=java.lang.IllegalStateException",
                event.getFormattedMessage());
        assertNull(event.getThrowableProxy());
        String arguments = Arrays.toString(event.getArgumentArray());
        for (String secret : new String[] {password, jdbcUrl, cliSecret, "exception-secret"}) {
            assertFalse(event.getFormattedMessage().contains(secret));
            assertFalse(arguments.contains(secret));
        }
    }

    @Test
    void diagnosticSinkFailureDoesNotChangeTheSafeHttpResponse() {
        Clock clock = Clock.fixed(Instant.parse("2026-08-09T00:00:00Z"), ZoneOffset.UTC);
        SetupExceptionHandler handler = new SetupExceptionHandler(clock, ignored -> {
            throw new RuntimeException("diagnostic failure");
        });

        var response = assertDoesNotThrow(() -> handler.unexpectedFailure(new IllegalStateException()));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("no-store", response.getHeaders().getFirst("Cache-Control"));
        assertEquals(SetupErrorCode.INTERNAL_ERROR, response.getBody().errorCode());
        assertEquals(clock.instant(), response.getBody().observedAt());
    }

    @Test
    void typedAndInvalidRequestsAreNotLoggedAsUnexpected() throws Exception {
        when(workflow.status()).thenThrow(
                new SetupApiException(SetupErrorCode.CONFIG_READ_ONLY, HttpStatus.CONFLICT));

        mvc.perform(get(SetupApiContract.STATUS_PATH)).andExpect(status().isConflict());
        mvc.perform(post(SetupApiContract.UNLOCK_PATH)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());

        assertTrue(appender.list.stream().noneMatch(event -> event.getLevel() == Level.ERROR));
    }

    @Test
    void metadataWriteAdmissionFailureIsSafeServiceUnavailableInsteadOfInternalError() throws Exception {
        when(workflow.status()).thenThrow(MetadataWriteAdmissionException.metadataWritesPaused());

        mvc.perform(get(SetupApiContract.STATUS_PATH))
                .andExpect(status().isServiceUnavailable())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.errorCode").value("metadata_writes_paused"))
                .andExpect(jsonPath("$.message").value("Metadata writes are temporarily unavailable"))
                .andExpect(content().string(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.containsString("operation-private"))));

        assertTrue(appender.list.stream().noneMatch(event -> event.getLevel() == Level.ERROR));
    }
}
