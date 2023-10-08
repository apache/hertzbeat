package org.dromara.hertzbeat.manager.service;

import org.dromara.hertzbeat.manager.service.impl.AppServiceImpl;
import org.dromara.hertzbeat.manager.service.impl.ObjectStoreConfigServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Test case for {@link AppService}
 */
@ExtendWith(MockitoExtension.class)
class AppServiceTest {

    @InjectMocks
    private AppServiceImpl appService;

    @Mock
    private ObjectStoreConfigServiceImpl objectStoreConfigService;

    @BeforeEach
    void setUp() throws Exception {
        appService.run();
    }

    @Test
    void getAppParamDefines() {
        assertDoesNotThrow(() -> appService.getAppParamDefines("jvm"));
    }

    @Test
    void getAppDefine() {
        assertDoesNotThrow(() -> appService.getAppDefine("jvm"));
        assertThrows(IllegalArgumentException.class, () -> appService.getAppDefine("unknown"));
    }

    @Test
    void getAppDefineMetricNames() {
        assertDoesNotThrow(() -> appService.getAppDefineMetricNames("jvm"));
    }

    @Test
    void getI18nResources() {
        assertDoesNotThrow(() -> appService.getI18nResources("en-US"));
    }

    @Test
    void getAllAppHierarchy() {
        assertDoesNotThrow(() -> appService.getAllAppHierarchy("en-US"));
    }
}