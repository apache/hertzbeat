package org.apache.hertzbeat.manager.component.validator.impl;

import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.apache.hertzbeat.common.util.AesUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PasswordParamValidatorTest {

    private PasswordParamValidator validator;

    @BeforeEach
    void setUp() {
        validator = new PasswordParamValidator();
    }

    @Test
    void support() {
        assertTrue(validator.support("password"));
    }

    @Test
    void validate_EncryptsPlaintext() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("password");
        Param param = new Param();
        String plaintext = "password123";
        param.setParamValue(plaintext);

        validator.validate(paramDefine, param);

        assertNotEquals(plaintext, param.getParamValue());
        assertTrue(AesUtil.isCiphertext(param.getParamValue()));
        assertEquals(CommonConstants.PARAM_TYPE_PASSWORD, param.getType());
    }

    @Test
    void validate_IgnoresCiphertext() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("password");
        Param param = new Param();
        String ciphertext = AesUtil.aesEncode("password123");
        param.setParamValue(ciphertext);

        validator.validate(paramDefine, param);

        assertEquals(ciphertext, param.getParamValue());
        assertEquals(CommonConstants.PARAM_TYPE_PASSWORD, param.getType());
    }
}
