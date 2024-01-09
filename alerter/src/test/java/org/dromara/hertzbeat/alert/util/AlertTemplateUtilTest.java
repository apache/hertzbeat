package org.dromara.hertzbeat.alert.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test case for {@link AlertTemplateUtil}
 */
class AlertTemplateUtilTest {

    class TemplateValue {

    }

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
}