package org.apache.hertzbeat.manager.component.validator.impl;

import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HostParamValidatorTest {

    private HostParamValidator validator;

    @BeforeEach
    void setUp() {
        validator = new HostParamValidator();
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
        // Note: The validator modifies the local variable hostValue but not the param
        // object itself in the current implementation for stripping http/https.
        // Wait, looking at the implementation:
        // String hostValue = param.getParamValue();
        // ... modifications to hostValue ...
        // if (!IpDomainUtil.validateIpDomain(hostValue)) ...
        // It validates the stripped value but doesn't update the param value. This
        // seems to be the intended behavior based on original code.
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
}
