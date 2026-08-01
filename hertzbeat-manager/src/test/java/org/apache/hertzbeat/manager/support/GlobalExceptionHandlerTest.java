/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.support;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.hertzbeat.common.support.exception.TelemetryStorageUnavailableException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

class GlobalExceptionHandlerTest {

    private static final String PRIVATE_DISCONNECT_DETAIL = "private client disconnect detail";
    private static final String PRIVATE_SERIALIZATION_DETAIL = "private serialization failure detail";

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new DisconnectController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void asyncResponseNotUsableDoesNotWriteJsonOrLogAnError() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        Level previousLevel = logger.getLevel();
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        logger.setLevel(Level.DEBUG);
        try {
            mockMvc.perform(MockMvcRequestBuilders.get("/sse-disconnect"))
                    .andExpect(status().isOk())
                    .andExpect(content().string(""));

            assertFalse(appender.list.stream().anyMatch(event -> event.getLevel() == Level.ERROR));
            assertFalse(appender.list.stream()
                    .map(ILoggingEvent::getFormattedMessage)
                    .anyMatch(message -> message.contains(PRIVATE_DISCONNECT_DETAIL)));
        } finally {
            logger.detachAppender(appender);
            logger.setLevel(previousLevel);
            appender.stop();
        }
    }

    @Test
    void committedWriteFailureCausedByAsyncDisconnectDoesNotWriteJsonOrLogPrivateDetail() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        Level previousLevel = logger.getLevel();
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        logger.setLevel(Level.DEBUG);
        try {
            mockMvc.perform(MockMvcRequestBuilders.get("/committed-write-disconnect"))
                    .andExpect(status().isOk())
                    .andExpect(content().string(""));

            assertFalse(appender.list.stream().anyMatch(event -> event.getLevel() == Level.ERROR));
            assertFalse(appender.list.stream()
                    .map(ILoggingEvent::getFormattedMessage)
                    .anyMatch(message -> message.contains(PRIVATE_DISCONNECT_DETAIL)));
        } finally {
            logger.detachAppender(appender);
            logger.setLevel(previousLevel);
            appender.stop();
        }
    }

    @Test
    void genuineDtoSerializationFailureRemainsServerError() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            mockMvc.perform(MockMvcRequestBuilders.get("/serialization-failure"))
                    .andExpect(status().isInternalServerError());

            assertTrue(appender.list.stream().anyMatch(event -> event.getLevel() == Level.ERROR));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    @Test
    void uncommittedWriteFailureWithAsyncCauseRemainsServerError() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            mockMvc.perform(MockMvcRequestBuilders.get("/uncommitted-write-failure"))
                    .andExpect(status().isInternalServerError());

            assertTrue(appender.list.stream().anyMatch(event -> event.getLevel() == Level.ERROR));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    @Test
    void telemetryStorageFailureIsAnExplicitSafeUnavailableResponse() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.get("/telemetry-storage-unavailable"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(content().string(containsString("telemetry storage unavailable")))
                .andExpect(content().string(not(containsString(PRIVATE_SERIALIZATION_DETAIL))));
    }

    @RestController
    private static final class DisconnectController {

        @GetMapping(value = "/sse-disconnect", produces = TEXT_EVENT_STREAM_VALUE)
        void disconnect() throws AsyncRequestNotUsableException {
            throw new AsyncRequestNotUsableException(PRIVATE_DISCONNECT_DETAIL);
        }

        @GetMapping("/committed-write-disconnect")
        void committedWriteDisconnect(HttpServletResponse response) throws Exception {
            response.flushBuffer();
            throw wrappedDisconnectFailure();
        }

        @GetMapping("/uncommitted-write-failure")
        void uncommittedWriteFailure() {
            throw wrappedDisconnectFailure();
        }

        @GetMapping("/serialization-failure")
        SerializationFailureDto serializationFailure() {
            return new SerializationFailureDto();
        }

        @GetMapping("/telemetry-storage-unavailable")
        void telemetryStorageUnavailable() {
            throw new TelemetryStorageUnavailableException();
        }

        private HttpMessageNotWritableException wrappedDisconnectFailure() {
            return new HttpMessageNotWritableException(
                    PRIVATE_DISCONNECT_DETAIL,
                    new IllegalStateException(
                            "write failure wrapper",
                            new AsyncRequestNotUsableException(PRIVATE_DISCONNECT_DETAIL)));
        }
    }

    private static final class SerializationFailureDto {

        public String getValue() {
            throw new IllegalStateException(PRIVATE_SERIALIZATION_DETAIL);
        }
    }
}
