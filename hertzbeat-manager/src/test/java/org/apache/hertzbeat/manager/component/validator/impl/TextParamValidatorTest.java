package org.apache.hertzbeat.manager.component.validator.impl;

import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TextParamValidatorTest {

    private TextParamValidator validator;

    @BeforeEach
    void setUp() {
        validator = new TextParamValidator();
    }

    @Test
    void support() {
        assertTrue(validator.support("text"));
        assertTrue(validator.support("textarea"));
    }

    @Test
    void validate_ValidLength() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("text");
        paramDefine.setLimit((short) 10);
        Param param = new Param();
        param.setParamValue("12345");

        assertDoesNotThrow(() -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_OverLimit() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("text");
        paramDefine.setField("name");
        paramDefine.setLimit((short) 3);
        Param param = new Param();
        param.setParamValue("12345");

        assertThrows(IllegalArgumentException.class, () -> validator.validate(paramDefine, param));
    }
}
