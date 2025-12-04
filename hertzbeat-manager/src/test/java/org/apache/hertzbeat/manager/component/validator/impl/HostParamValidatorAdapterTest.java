package org.apache.hertzbeat.manager.component.validator.impl;

import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HostParamValidatorAdapterTest {

    private HostParamValidatorAdapter validator;

    @BeforeEach
    void setUp() {
        validator = new HostParamValidatorAdapter();
    }

    @Test
    void support() {
        assertTrue(validator.support("host"));
    }

    @Test
    void validate_ValidHost() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("host");
        Param param = new Param();
        param.setParamValue("127.0.0.1");

        assertDoesNotThrow(() -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_ValidDomain() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("host");
        Param param = new Param();
        param.setParamValue("localhost");

        assertDoesNotThrow(() -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_HttpPrefix() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("host");
        Param param = new Param();
        param.setParamValue("http://127.0.0.1");

        assertDoesNotThrow(() -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_InvalidHost() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("host");
        paramDefine.setField("host");
        Param param = new Param();
        param.setParamValue("invalid host");

        assertThrows(IllegalArgumentException.class, () -> validator.validate(paramDefine, param));
    }

    @Test
    void validate_HostWithPort() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("host");
        Param param = new Param();
        param.setParamValue("127.0.0.1:8080");

        assertDoesNotThrow(() -> validator.validate(paramDefine, param));
    }
}
