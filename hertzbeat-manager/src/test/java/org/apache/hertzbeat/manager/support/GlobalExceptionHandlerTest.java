/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.support;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

class GlobalExceptionHandlerTest {

    private static final String PRIVATE_DISCONNECT_DETAIL = "private client disconnect detail";

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

    @RestController
    private static final class DisconnectController {

        @GetMapping(value = "/sse-disconnect", produces = TEXT_EVENT_STREAM_VALUE)
        void disconnect() throws AsyncRequestNotUsableException {
            throw new AsyncRequestNotUsableException(PRIVATE_DISCONNECT_DETAIL);
        }
    }
}
