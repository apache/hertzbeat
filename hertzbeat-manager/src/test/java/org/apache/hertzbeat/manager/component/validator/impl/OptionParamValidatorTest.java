package org.apache.hertzbeat.manager.component.validator.impl;

import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OptionParamValidatorTest {

    private OptionParamValidator validator;

    @BeforeEach
    void setUp() {
        validator = new OptionParamValidator();
    }

    @Test
    void support() {
        assertTrue(validator.support("radio"));
        assertTrue(validator.support("checkbox"));
    }

    @Test
    void validate_ValidOption() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("radio");
        paramDefine.setOptions(List.of(new ParamDefine.Option("opt1", "val1"), new ParamDefine.Option("opt2", "val2")));
        Param param = new Param();
        param.setParamValue("val1");

        assertDoesNotThrow(() -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_InvalidOption() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("radio");
        paramDefine.setField("method");
        paramDefine.setOptions(List.of(new ParamDefine.Option("opt1", "val1")));
        Param param = new Param();
        param.setParamValue("val2");

        assertThrows(IllegalArgumentException.class, () -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_NullOptions() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("radio");
        paramDefine.setField("method");
        Param param = new Param();
        param.setParamValue("val1");

        assertThrows(IllegalArgumentException.class, () -> validator.validate(paramDefine, param));
    }
}
