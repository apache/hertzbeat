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

package org.apache.hertzbeat.templatehub.exception;

import org.apache.hertzbeat.templatehub.model.DTO.Message;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler globalExceptionHandler;

    @BeforeEach
    public void setUp() {
        globalExceptionHandler = new GlobalExceptionHandler();
        MockitoAnnotations.openMocks(this);
    }

    @Test
    public void testCustomException() {
        // Arrange
        String expectedMessage = "This is a custom exception";
        HertzbeatTemplateHubException exception = new HertzbeatTemplateHubException(expectedMessage);

        // Act
        ResponseEntity<Message<Object>> response = globalExceptionHandler.customException(exception);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(15, response.getBody().getCode());
        assertEquals(expectedMessage, response.getBody().getMsg());
    }

    @Test
    public void testGenericException() {
        // Arrange
        String expectedMessage = "An unexpected error occurred";
        Exception exception = new Exception(expectedMessage);

        // Act
        ResponseEntity<Message<Object>> response = globalExceptionHandler.exception(exception);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(15, response.getBody().getCode());
        assertEquals(CommonError.UNKNOWN_ERROR.getErrMsg(), response.getBody().getMsg());
    }

    @Test
    public void testAccessDeniedException() {
        // Arrange
        Exception exception = new Exception("不允许访问");

        // Act
        ResponseEntity<Message<Object>> response = globalExceptionHandler.exception(exception);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(15, response.getBody().getCode());
        assertEquals("您没有权限操作此功能", response.getBody().getMsg());
    }
}