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

package org.apache.hertzbeat.alert.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Test case for {@link AlertTemplateUtil}
 */
class AlertTemplateUtilTest {

    @BeforeEach
    void setUp() {
    }

    @Test
    void render() {
        // test null template case
        Map<String, Object> param = new HashMap<>();
        String template = null;
        assertNull(AlertTemplateUtil.render(null, param));
        // test null map case
        template = "${key} for testing";
        assertEquals(AlertTemplateUtil.render(template, null), template);
        // test null template and null map case
        assertNull(AlertTemplateUtil.render(null, null));
        // test illegal template case
        template = "";
        param.put("key", "Just");
        assertEquals(AlertTemplateUtil.render(template, param), template);
        template = "key for testing!";
        assertEquals(AlertTemplateUtil.render(template, param), template);
        // test empty map case
        param.clear();
        template = "${key} for testing";
        assertEquals(AlertTemplateUtil.render(template, param), "NullValue for testing");
        // test illegal template and empty map case
        param.clear();
        template = "key for testing";
        assertEquals(AlertTemplateUtil.render(template, param), template);
        // test one param
        param.put("key", "Just");
        template = "${key} for testing";
        assertEquals(AlertTemplateUtil.render(template, param), "Just for testing");
        // test two param
        param.put("key1", "Just");
        param.put("key2", "testing");
        template = "${key1} for ${key2}";
        assertEquals(AlertTemplateUtil.render(template, param), "Just for testing");
        // test all param
        param.put("key1", "Just");
        param.put("key2", "for");
        param.put("key3", "testing");
        template = "${key1} ${key2} ${key3}";
        assertEquals(AlertTemplateUtil.render(template, param), "Just for testing");
    }

    @Test
    void renderSpecialCharacters() {
        Map<String, Object> param = new HashMap<>();
        param.put("valueWithDollar", "$100");
        param.put("valueWithBackslash", "C:\\Users");

        String template = "The price is ${valueWithDollar} and the path is ${valueWithBackslash}";

        // Expected to handle the dollar sign and backslash correctly without throwing an exception
        String expectedResult = "The price is $100 and the path is C:\\Users";
        assertEquals(expectedResult, AlertTemplateUtil.render(template, param));
    }

    @Test
    void renderNestedMapProperties() {
        Map<String, Object> param = new HashMap<>();
        Map<String, Object> log = new HashMap<>();
        Map<String, Object> attributes = new HashMap<>();
        
        attributes.put("level", "ERROR");
        attributes.put("thread", "main");
        log.put("attributes", attributes);
        log.put("message", "Connection failed");
        log.put("timestamp", "2024-01-01T10:00:00Z");
        
        param.put("log", log);
        param.put("instance", "server-01");

        String template = "Log alert: ${log.attributes.level} - ${log.message} on ${instance}";
        String expectedResult = "Log alert: ERROR - Connection failed on server-01";
        assertEquals(expectedResult, AlertTemplateUtil.render(template, param));
    }

    @Test
    void renderMultiLevelNestedProperties() {
        Map<String, Object> param = new HashMap<>();
        Map<String, Object> config = new HashMap<>();
        Map<String, Object> database = new HashMap<>();
        Map<String, Object> connection = new HashMap<>();
        
        connection.put("host", "localhost");
        connection.put("port", 3306);
        database.put("connection", connection);
        database.put("name", "hertzbeat");
        config.put("database", database);
        
        param.put("config", config);

        String template = "Database: ${config.database.name} at ${config.database.connection.host}:${config.database.connection.port}";
        String expectedResult = "Database: hertzbeat at localhost:3306";
        assertEquals(expectedResult, AlertTemplateUtil.render(template, param));
    }

    @Test
    void renderNonExistentNestedProperties() {
        Map<String, Object> param = new HashMap<>();
        Map<String, Object> log = new HashMap<>();
        
        log.put("message", "Test message");
        param.put("log", log);

        // Test non-existent nested property
        String template = "Log alert: ${log.nonexistent.property} - ${log.message}";
        String expectedResult = "Log alert: NullValue - Test message";
        assertEquals(expectedResult, AlertTemplateUtil.render(template, param));
    }

    @Test
    void renderNonExistentTopLevelProperty() {
        Map<String, Object> param = new HashMap<>();
        param.put("existing", "value");

        String template = "Value: ${nonexistent.property}";
        String expectedResult = "Value: NullValue";
        assertEquals(expectedResult, AlertTemplateUtil.render(template, param));
    }

    @Test
    void renderNestedPropertiesWithNullValues() {
        Map<String, Object> param = new HashMap<>();
        Map<String, Object> data = new HashMap<>();
        
        data.put("value", null);
        data.put("description", "Test data");
        param.put("data", data);

        String template = "Data: ${data.value} - ${data.description}";
        String expectedResult = "Data: NullValue - Test data";
        assertEquals(expectedResult, AlertTemplateUtil.render(template, param));
    }

    @Test
    void renderComplexNestedStructure() {
        Map<String, Object> param = new HashMap<>();
        Map<String, Object> alert = new HashMap<>();
        Map<String, Object> monitor = new HashMap<>();
        Map<String, Object> target = new HashMap<>();
        Map<String, Object> metadata = new HashMap<>();
        
        metadata.put("version", "1.0");
        metadata.put("author", "system");
        target.put("host", "192.168.1.100");
        target.put("port", 8080);
        target.put("metadata", metadata);
        monitor.put("name", "HTTP Monitor");
        monitor.put("target", target);
        alert.put("monitor", monitor);
        alert.put("severity", "CRITICAL");
        
        param.put("alert", alert);

        String template = "Alert: ${alert.severity} from ${alert.monitor.name} targeting ${alert.monitor.target.host}:${alert.monitor.target.port} (v${alert.monitor.target.metadata.version})";
        String expectedResult = "Alert: CRITICAL from HTTP Monitor targeting 192.168.1.100:8080 (v1.0)";
        assertEquals(expectedResult, AlertTemplateUtil.render(template, param));
    }

    @Test
    void renderWithDifferentDataTypes() {
        Map<String, Object> param = new HashMap<>();
        Map<String, Object> metrics = new HashMap<>();
        
        metrics.put("cpu", 85.5);
        metrics.put("memory", 1024);
        metrics.put("active", true);
        metrics.put("count", 42L);
        
        param.put("metrics", metrics);

        String template = "CPU: ${metrics.cpu}%, Memory: ${metrics.memory}MB, Active: ${metrics.active}, Count: ${metrics.count}";
        String expectedResult = "CPU: 85.5%, Memory: 1024MB, Active: true, Count: 42";
        assertEquals(expectedResult, AlertTemplateUtil.render(template, param));
    }

    // Helper classes for testing object property access
    public static class TestObject {
        private String name;
        private int value;
        private TestNestedObject nested;
        
        public TestObject(String name, int value) {
            this.name = name;
            this.value = value;
        }
        
        public String getName() {
            return name;
        }
        
        public int getValue() {
            return value;
        }
        
        public TestNestedObject getNested() {
            return nested;
        }
        
        public void setNested(TestNestedObject nested) {
            this.nested = nested;
        }
    }
    
    public static class TestNestedObject {
        private String description;
        private boolean enabled;
        
        public TestNestedObject(String description, boolean enabled) {
            this.description = description;
            this.enabled = enabled;
        }
        
        public String getDescription() {
            return description;
        }
        
        public boolean isEnabled() {
            return enabled;
        }
    }

    @Test
    void renderWithObjectProperties() {
        Map<String, Object> param = new HashMap<>();
        TestNestedObject nested = new TestNestedObject("Test description", true);
        TestObject obj = new TestObject("TestName", 123);
        obj.setNested(nested);
        
        param.put("object", obj);

        String template = "Object: ${object.name} (value: ${object.value}) - ${object.nested.description}, enabled: ${object.nested.enabled}";
        String expectedResult = "Object: TestName (value: 123) - Test description, enabled: true";
        assertEquals(expectedResult, AlertTemplateUtil.render(template, param));
    }

    @Test
    void renderWithMixedMapAndObjectProperties() {
        Map<String, Object> param = new HashMap<>();
        Map<String, Object> config = new HashMap<>();
        TestObject obj = new TestObject("ConfigObject", 456);
        
        config.put("object", obj);
        config.put("type", "mixed");
        param.put("config", config);

        String template = "Config type: ${config.type}, object name: ${config.object.name}, value: ${config.object.value}";
        String expectedResult = "Config type: mixed, object name: ConfigObject, value: 456";
        assertEquals(expectedResult, AlertTemplateUtil.render(template, param));
    }
}
