package com.usthe.manager.service;

import com.usthe.manager.AbstractSpringIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.annotation.Resource;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Test case for {@link AppService}
 */
class AppServiceTest extends AbstractSpringIntegrationTest {

    @Resource
    private AppService appService;

    private final List<String> appList = new ArrayList<>();

    @BeforeEach
    void setUp() throws IOException {
        try (Stream<Path> pathStream = Files.list(Paths.get("src/main/resources/define/app"))) {
            pathStream.forEach(path -> {
                Path fileName = path.getFileName();
                String appName = fileName.toString()
                        .replace("app-", "")
                        .replace(".yml", "");
                if (!appName.endsWith("example")) {
                    // ignore example app name
                    appList.add(appName);
                }
            });
        }
        assertFalse(appList.isEmpty());
    }

    @Test
    void getAppParamDefines() {
        // mock app is empty
        assertTrue(appService.getAppParamDefines("mock app").isEmpty());
        // all app param definitions are not empty
        appList.forEach(app -> {
            assertFalse(appService.getAppParamDefines(app).isEmpty());
        });
    }

    @Test
    void getAppDefine() {
        // mock app is empty
        assertThrows(IllegalArgumentException.class, () -> appService.getAppDefine("mock app"));

        // all app define is not null
        appList.forEach(app -> {
            assertNotNull(appService.getAppDefine(app));
        });
    }

    @Test
    void getAppDefineMetricNames() {
        // mock app is empty
        assertThrows(IllegalArgumentException.class, () -> appService.getAppDefineMetricNames("mock app"));

        // all app define metrics are not empty
        appList.forEach(app -> {
            assertFalse(appService.getAppDefineMetricNames(app).isEmpty());
        });
    }

    @Test
    void getI18nResources() {
        assertFalse(appService.getI18nResources("zh-CN").isEmpty());
        assertFalse(appService.getI18nResources("en-US").isEmpty());
    }

    @Test
    void getAllAppHierarchy() {
        assertFalse(appService.getAllAppHierarchy("zh-CN").isEmpty());
        assertFalse(appService.getAllAppHierarchy("en-US").isEmpty());
    }
}