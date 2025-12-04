package org.apache.hertzbeat.manager.component.validator.impl;

import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NumberParamValidatorTest {

    private NumberParamValidator validator;

    @BeforeEach
    void setUp() {
        validator = new NumberParamValidator();
    }

    @Test
    void support() {
        assertTrue(validator.support("number"));
    }

    @Test
    void validate_ValidNumber() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("number");
        Param param = new Param();
        param.setParamValue("123");

        validator.validate(paramDefine, param);
        assertEquals(CommonConstants.PARAM_TYPE_NUMBER, param.getType());
    }

    @Test
    void validate_InvalidNumber() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("number");
        paramDefine.setField("port");
        Param param = new Param();
        param.setParamValue("abc");

        assertThrows(IllegalArgumentException.class, () -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_NumberInRange() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("number");
        paramDefine.setRange("[0,100]");
        Param param = new Param();
        param.setParamValue("50");

        validator.validate(paramDefine, param);
    }

    @Test
    void validate_NumberOutOfRange() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("number");
        paramDefine.setField("port");
        paramDefine.setRange("[0,100]");
        Param param = new Param();
        param.setParamValue("150");

        assertThrows(IllegalArgumentException.class, () -> validator.validate(paramDefine, param));
    }
}
