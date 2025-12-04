package org.apache.hertzbeat.manager.component.validator;

import org.apache.hertzbeat.common.entity.manager.Param;
import org.apache.hertzbeat.common.entity.manager.ParamDefine;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ParamValidatorManagerTest {

    private ParamValidatorManager paramValidatorManager;

    @Mock
    private ParamValidator paramValidator;

    @BeforeEach
    void setUp() {
        paramValidatorManager = new ParamValidatorManager(List.of(paramValidator));
    }

    @Test
    void validate_Success() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("text");
        Param param = new Param();

        when(paramValidator.support("text")).thenReturn(true);

        assertDoesNotThrow(() -> paramValidatorManager.validate(paramDefine, param));
        verify(paramValidator).validate(paramDefine, param);
    }

    @Test
    void validate_NoValidatorFound() {
        ParamDefine paramDefine = new ParamDefine();
        paramDefine.setType("unknown");
        Param param = new Param();

        when(paramValidator.support("unknown")).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () -> paramValidatorManager.validate(paramDefine, param));
    }
}
