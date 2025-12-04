package org.apache.hertzbeat.manager.component.validator.impl;

import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JsonParamValidatorTest {

    private JsonParamValidator validator;

    @BeforeEach
    void setUp() {
        validator = new JsonParamValidator();
    }

    @Test
    void support() {
        assertTrue(validator.support("metrics-field"));
        assertTrue(validator.support("key-value"));
    }

    @Test
    void validate_ValidJson() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("key-value");
        Param param = new Param();
        param.setParamValue("{\"key\":\"value\"}");

        assertDoesNotThrow(() -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_InvalidJson() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("key-value");
        paramDefine.setField("headers");
        Param param = new Param();
        param.setParamValue("{key:value}"); // Invalid JSON

        assertThrows(IllegalArgumentException.class, () -> validator.validate(paramDefine, param));
    }
}
