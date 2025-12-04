package org.apache.hertzbeat.manager.component.validator.impl;

import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BooleanParamValidatorTest {

    private BooleanParamValidator validator;

    @BeforeEach
    void setUp() {
        validator = new BooleanParamValidator();
    }

    @Test
    void support() {
        assertTrue(validator.support("boolean"));
    }

    @Test
    void validate_True() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("boolean");
        Param param = new Param();
        param.setParamValue("true");

        assertDoesNotThrow(() -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_False() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("boolean");
        Param param = new Param();
        param.setParamValue("false");

        assertDoesNotThrow(() -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_CaseInsensitive() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("boolean");
        Param param = new Param();
        param.setParamValue("True");

        assertDoesNotThrow(() -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_Invalid() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("boolean");
        paramDefine.setField("ssl");
        Param param = new Param();
        param.setParamValue("yes");

        assertThrows(IllegalArgumentException.class, () -> validator.validate(paramDefine, param));
    }
}
