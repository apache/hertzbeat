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

package org.apache.hertzbeat.alert.calculate.realtime;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.apache.hertzbeat.alert.AlerterWorkerPool;
import org.apache.hertzbeat.alert.calculate.AlarmCacheManager;
import org.apache.hertzbeat.alert.calculate.JexlExprCalculator;
import org.apache.hertzbeat.alert.dao.SingleAlertDao;
import org.apache.hertzbeat.alert.reduce.AlarmCommonReduce;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.common.entity.log.LogEntry;
import org.apache.hertzbeat.common.queue.CommonDataQueue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.HashMap;
import java.util.Map;

class LogRealTimeAlertCalculatorTest {

    private LogRealTimeAlertCalculator calculator;

    @BeforeEach
    void setUp() {
        AlerterWorkerPool mockPool = Mockito.mock(AlerterWorkerPool.class);
        CommonDataQueue mockQueue = Mockito.mock(CommonDataQueue.class);
        AlertDefineService mockAlertDefineService = Mockito.mock(AlertDefineService.class);
        SingleAlertDao mockDao = Mockito.mock(SingleAlertDao.class);
        AlarmCommonReduce mockReduce = Mockito.mock(AlarmCommonReduce.class);
        AlarmCacheManager alarmCacheManager = Mockito.mock(AlarmCacheManager.class);
        JexlExprCalculator mockExprCalculator = Mockito.mock(JexlExprCalculator.class);

        calculator = new LogRealTimeAlertCalculator(mockPool, mockQueue, mockAlertDefineService, 
                mockDao, mockReduce, alarmCacheManager, mockExprCalculator,false);
    }

    @Test
    void testExecAlertExpression_SeverityNumberAndSeverityText_ShouldMatch() {
        // Arrange
        LogEntry logEntry = createLogEntry(2, "ERROR", "System error occurred", null);
        Map<String, Object> fieldValueMap = new HashMap<>();
        fieldValueMap.put("log", logEntry);

        String expr = "(log.severityNumber == 2) && (contains(log.severityText, \"ERROR\"))";

        // Act
        boolean result = calculator.jexlExprCalculator.execAlertExpression(fieldValueMap, expr, false);

        // Assert
        assertTrue(result, "Expression should match when severityNumber is 2 and severityText contains 'ERROR'");
    }

    @Test
    void testExecAlertExpression_SeverityNumberMatches_SeverityTextNotMatch_ShouldNotMatch() {
        // Arrange
        LogEntry logEntry = createLogEntry(2, "INFO", "Information message", null);
        Map<String, Object> fieldValueMap = new HashMap<>();
        fieldValueMap.put("log", logEntry);

        String expr = "(log.severityNumber == 2) && (contains(log.severityText, \"ERROR\"))";

        // Act
        boolean result = calculator.jexlExprCalculator.execAlertExpression(fieldValueMap, expr, false);

        // Assert
        assertFalse(result, "Expression should not match when severityText doesn't contain 'ERROR'");
    }

    @Test
    void testExecAlertExpression_SeverityNumberNotMatch_SeverityTextMatches_ShouldNotMatch() {
        // Arrange
        LogEntry logEntry = createLogEntry(1, "ERROR", "System error occurred", null);
        Map<String, Object> fieldValueMap = new HashMap<>();
        fieldValueMap.put("log", logEntry);

        String expr = "(log.severityNumber == 2) && (contains(log.severityText, \"ERROR\"))";

        // Act
        boolean result = calculator.jexlExprCalculator.execAlertExpression(fieldValueMap, expr, false);

        // Assert
        assertFalse(result, "Expression should not match when severityNumber is not 2");
    }

    @Test
    void testExecAlertExpression_CaseInsensitiveContains_ShouldMatch() {
        // Arrange
        LogEntry logEntry = createLogEntry(2, "error", "System error occurred", null);
        Map<String, Object> fieldValueMap = new HashMap<>();
        fieldValueMap.put("log", logEntry);

        String expr = "(log.severityNumber == 2) && (contains(log.severityText.toLowerCase(), \"error\"))";

        // Act
        boolean result = calculator.jexlExprCalculator.execAlertExpression(fieldValueMap, expr, false);

        // Assert
        assertTrue(result, "Expression should match with case-insensitive comparison");
    }

    @Test
    void testExecAlertExpression_SeverityGreaterThan_ShouldMatch() {
        // Arrange
        LogEntry logEntry = createLogEntry(5, "CRITICAL", "Critical error", null);
        Map<String, Object> fieldValueMap = new HashMap<>();
        fieldValueMap.put("log", logEntry);

        String expr = "log.severityNumber > 2";

        // Act
        boolean result = calculator.jexlExprCalculator.execAlertExpression(fieldValueMap, expr, false);

        // Assert
        assertTrue(result, "Expression should match when severityNumber is greater than 2");
    }

    @Test
    void testExecAlertExpression_BodyContains_ShouldMatch() {
        // Arrange
        LogEntry logEntry = createLogEntry(2, "ERROR", "Database connection failed", null);
        Map<String, Object> fieldValueMap = new HashMap<>();
        fieldValueMap.put("log", logEntry);

        String expr = "contains(log.body, \"Database\")";

        // Act
        boolean result = calculator.jexlExprCalculator.execAlertExpression(fieldValueMap, expr, false);

        // Assert
        assertTrue(result, "Expression should match when body contains 'Database'");
    }

    @Test
    void testExecAlertExpression_AttributesCheck_ShouldMatch() {
        // Arrange
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("service", "user-service");
        attributes.put("environment", "production");
        
        LogEntry logEntry = createLogEntry(3, "WARN", "Service warning", attributes);
        Map<String, Object> fieldValueMap = new HashMap<>();
        fieldValueMap.put("log", logEntry);

        String expr = "log.attributes.service == \"user-service\"";

        // Act
        boolean result = calculator.jexlExprCalculator.execAlertExpression(fieldValueMap, expr, false);

        // Assert
        assertTrue(result, "Expression should match when attributes contain expected service");
    }

    @Test
    void testExecAlertExpression_ComplexExpression_ShouldMatch() {
        // Arrange
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("service", "user-service");
        attributes.put("environment", "production");
        
        LogEntry logEntry = createLogEntry(4, "ERROR", "Authentication failed", attributes);
        Map<String, Object> fieldValueMap = new HashMap<>();
        fieldValueMap.put("log", logEntry);

        String expr = "(log.severityNumber >= 3) && (contains(log.severityText, \"ERROR\")) && (log.attributes.environment == \"production\")";

        // Act
        boolean result = calculator.jexlExprCalculator.execAlertExpression(fieldValueMap, expr, false);

        // Assert
        assertTrue(result, "Complex expression should match all conditions");
    }

    @Test
    void testExecAlertExpression_OrExpression_ShouldMatch() {
        // Arrange
        LogEntry logEntry = createLogEntry(1, "DEBUG", "Debug information", null);
        Map<String, Object> fieldValueMap = new HashMap<>();
        fieldValueMap.put("log", logEntry);

        String expr = "(log.severityNumber == 5) || (contains(log.body, \"Debug\"))";

        // Act
        boolean result = calculator.jexlExprCalculator.execAlertExpression(fieldValueMap, expr, false);

        // Assert
        assertTrue(result, "OR expression should match when at least one condition is true");
    }

    @Test
    void testExecAlertExpression_TimestampCheck_ShouldMatch() {
        // Arrange
        long currentTime = System.currentTimeMillis();
        long nanoTime = currentTime * 1_000_000; // Convert to nanoseconds
        
        LogEntry logEntry = LogEntry.builder()
                .timeUnixNano(nanoTime)
                .severityNumber(2)
                .severityText("ERROR")
                .body("Timestamp test")
                .build();
                
        Map<String, Object> fieldValueMap = new HashMap<>();
        fieldValueMap.put("log", logEntry);

        String expr = "log.timeUnixNano > 0";

        // Act
        boolean result = calculator.jexlExprCalculator.execAlertExpression(fieldValueMap, expr, false);

        // Assert
        assertTrue(result, "Expression should match when timestamp is greater than 0");
    }

    @Test
    void testExecAlertExpression_NullBody_ShouldNotMatch() {
        // Arrange
        LogEntry logEntry = createLogEntry(2, "ERROR", null, null);
        Map<String, Object> fieldValueMap = new HashMap<>();
        fieldValueMap.put("log", logEntry);

        String expr = "contains(log.body, \"error\")";

        boolean result = calculator.jexlExprCalculator.execAlertExpression(fieldValueMap, expr, false);
        // Act & Assert
        assertFalse(result, "Expression should not match when body is null");
    }

    @Test
    void testExecAlertExpression_EmptyAttributes_ShouldNotMatch() {
        // Arrange
        LogEntry logEntry = createLogEntry(2, "ERROR", "Test message", new HashMap<>());
        Map<String, Object> fieldValueMap = new HashMap<>();
        fieldValueMap.put("log", logEntry);

        String expr = "log.attributes.service == \"user-service\"";

        // Act
        boolean result = calculator.jexlExprCalculator.execAlertExpression(fieldValueMap, expr, false);

        // Assert
        assertFalse(result, "Expression should not match when attributes is empty");
    }

    @Test
    void testExecAlertExpression_MultipleLogFields_ShouldMatch() {
        // Arrange
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("level", "error");
        attributes.put("component", "authentication");
        
        LogEntry logEntry = LogEntry.builder()
                .severityNumber(4)
                .severityText("ERROR")
                .body("Login failed for user admin")
                .attributes(attributes)
                .traceId("abc123")
                .spanId("def456")
                .build();
                
        Map<String, Object> fieldValueMap = new HashMap<>();
        fieldValueMap.put("log", logEntry);

        String expr = "(log.severityNumber == 4) && "
                + "(contains(log.body, \"Login failed\")) && "
                + "(log.attributes.component == \"authentication\") && "
                + "(log.traceId == \"abc123\")";

        // Act
        boolean result = calculator.jexlExprCalculator.execAlertExpression(fieldValueMap, expr, false);

        // Assert
        assertTrue(result, "Complex expression with multiple log fields should match");
    }

    private LogEntry createLogEntry(Integer severityNumber, String severityText, Object body, Map<String, Object> attributes) {
        return LogEntry.builder()
                .severityNumber(severityNumber)
                .severityText(severityText)
                .body(body)
                .attributes(attributes)
                .timeUnixNano(System.currentTimeMillis() * 1_000_000L) // Current time in nanoseconds
                .build();
    }
}
