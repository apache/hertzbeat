/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.automated.testing.pages.monitoring.monitors;

import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.ThreadUtils;
import org.apache.hertzbeat.automated.testing.core.MonitorsEditConfig;
import org.apache.hertzbeat.automated.testing.common.PageInfo;
import org.apache.hertzbeat.automated.testing.pages.monitoring.MonitorsNavPage;
import org.apache.hertzbeat.automated.testing.pages.navigation.NavBarPage;
import org.openqa.selenium.By;
import org.openqa.selenium.remote.RemoteWebDriver;

import java.lang.reflect.Field;
import java.time.Duration;

import static org.apache.hertzbeat.automated.testing.common.SelectorTypeEnum.NONE;
import static org.apache.hertzbeat.automated.testing.pages.navigation.NavBarPage.EMPTY;

/**
 * Monitors Edit Page
 */
@Slf4j
@PageInfo(
        selector = EMPTY,
        selectorType = NONE,
        urlPart = {"/edit", "/new"}
)
public class MonitorsEditPage extends NavBarPage implements MonitorsNavPage.InnerTab {

    public By targetHost = By.xpath("//input[@id='host']");
    public By taskName = By.xpath("//input[@id='name']");
    public By port = By.xpath("//nz-input-number[@id='port']/div[@class='ant-input-number-input-wrap']/input");
    public By databaseName = By.xpath("//input[@id='database']");
    public By username = By.xpath("//input[@id='username']");
    public By password = By.xpath("//input[@id='password']");

    public By intervals = By.xpath("//nz-input-number[@id='intervals']/div/input");
    public By bindLabelsKey = By.xpath("//input[@id='labels-0-key']");
    public By bindLabelsValue = By.xpath("//input[@id='labels-0-value']");
    public By bindAnnotationKey = By.xpath("//input[@id='annotations-0-key']");
    public By bindAnnotationValue = By.xpath("//input[@id='annotations-0-value']");
    public By description = By.xpath("//nz-textarea-count/textarea[@id='description']");

    public By detectBtn = By.xpath("//div[@class='ant-row']/div/button/span[contains(text(), 'Detect')]");
    public By okBtn = By.xpath("//div[@class='ant-row']/div/button/span[contains(text(), 'OK')]");
    public By cancelBtn = By.xpath("//div[@class='ant-row']/div/button/span[contains(text(), 'Cancel')]");

    private boolean markAdvancedBtn = true;

    public MonitorsEditPage(RemoteWebDriver driver) {
        super(driver);
    }

    public MonitorsEditPage clickDetectBtn() {
        waitForClickable(detectBtn).click();
        return this;
    }

    public MonitorsEditPage clickOkBtn() {
        waitForClickable(okBtn).click();
        return this;
    }

    public MonitorsEditPage clickCancelBtn() {
        waitForClickable(cancelBtn).click();
        return this;
    }

    /**
     * Advanced configuration page
     */
    public class Advanced {
        public By advancedBtn = By.xpath("//div[@role='button']//span[text()='Advanced']");
        public By queryTimeout = By.xpath("//nz-input-number[@id='timeout']/div/input");
        public By url = By.xpath("//input[@id='url']");
        public By enableSshTunnel = By.xpath("//nz-switch[@id='enableSshTunnel']");
        public By sshHost = By.xpath("//input[@id='sshHost']");
        public By sshPort = By.xpath("//nz-input-number[@id='sshPort']/div[@class='ant-input-number-input-wrap']/input");
        public By sshTimeout = By.xpath("//nz-input-number[@id='sshTimeout']/div[@class='ant-input-number-input-wrap']/input");
        public By sshUsername = By.xpath("//input[@id='sshUsername']");
        public By sshPassword = By.xpath("//input[@id='sshPassword']");
        public By shareSshConnection = By.xpath("//nz-switch[@id='sshShareConnection']");
        public By sshPrivateKey = By.xpath("//textarea[@id='sshPrivateKey']");
        public By sshPrivateKeyPassPhrase = By.xpath("//input[@id='sshPrivateKeyPassphrase']");

        public void clickAdvancedBtn() {
            if (markAdvancedBtn) {
                waitForClickable(advancedBtn).click();
                // Page advanced configuration items are not uniform, no matching waiting elements, set forced waiting.
                ThreadUtils.sleepQuietly(Duration.ofMillis(500));
                markAdvancedBtn = false;
            }
        }
    }

    /**
     * Collector configuration page
     */
    public class Collector {
        public By collectorSe = By.xpath("//nz-select[@id='collector' and @name='collector']");
        public By collectorItems = By.xpath("//cdk-virtual-scroll-viewport/div[@class='cdk-virtual-scroll-content-wrapper']/nz-option-item");

        public void clickCollectorSe() {
            waitForClickable(collectorSe).click();
        }

        public void setCollectorOption(LimitedEnum limitedEnum) {
            for (int i = 0; i < limitedEnum.getLength(); i++) {
                waitForClickable(By.xpath(
                        String.format("//cdk-virtual-scroll-viewport/div[@class='cdk-virtual-scroll-content-wrapper']/nz-option-item[%d]", i + 1)));
            }
            waitForVisibilityOfAll(collectorItems).get(limitedEnum.ordinal()).click();
        }
    }

    public MonitorsEditPage edit(MonitorsEditConfig monitorsEditConfig) {
        Class<MonitorsEditConfig> monitorsEditConfigClass = MonitorsEditConfig.class;
        Class<MonitorsEditConfig.Advanced> configAdvancedClass = MonitorsEditConfig.Advanced.class;
        Class<MonitorsEditConfig.Collector> configCollectorClass = MonitorsEditConfig.Collector.class;
        Class<MonitorsEditPage> monitorsEditPageClass = MonitorsEditPage.class;
        Class<Advanced> pageAdvancedClass = Advanced.class;
        // Class<Collector> pageCollectorClass = Collector.class;

        for (Field monitorsEditConfigField : monitorsEditConfigClass.getDeclaredFields()) {
            try {
                monitorsEditConfigField.setAccessible(true);
                String monitorsEditConfigFieldName = monitorsEditConfigField.getName();
                Object monitorsEditConfigFieldValue = monitorsEditConfigField.get(monitorsEditConfig);

                if (monitorsEditConfigFieldValue instanceof MonitorsEditConfig.Advanced configAdvanced) {
                    Advanced pageAdvanced = this.new Advanced();
                    for (Field configAdvancedField : configAdvancedClass.getDeclaredFields()) {
                        configAdvancedField.setAccessible(true);
                        String configAdvancedFieldName = configAdvancedField.getName();
                        Object configAdvancedFieldValue = configAdvancedField.get(configAdvanced);

                        Field pageAdvancedField = pageAdvancedClass.getDeclaredField(configAdvancedFieldName);
                        pageAdvancedField.setAccessible(true);
                        By by = (By) pageAdvancedField.get(pageAdvanced);
                        log.info(pageAdvancedField + ": " + configAdvancedFieldValue);

                        if (configAdvancedFieldValue instanceof Boolean) {
                            pageAdvanced.clickAdvancedBtn();
                            // Edit page switch button
                            String attribute = waitForClickable(by).getAttribute("ng-reflect-model");
                            if (attribute != null && !attribute.equals(configAdvancedFieldValue.toString())) {
                                waitForClickable(by).click();
                            }
                            continue;
                        }

                        if (configAdvancedFieldValue != null) {
                            pageAdvanced.clickAdvancedBtn();
                            this.sendKeysAction(by, configAdvancedFieldValue.toString());
                        }
                    }
                    continue;
                }

                if (monitorsEditConfigFieldValue instanceof MonitorsEditConfig.Collector configCollector) {
                    Collector pageCollector = this.new Collector();
                    for (Field configCollectorField : configCollectorClass.getDeclaredFields()) {
                        configCollectorField.setAccessible(true);
                        String configCollectorFieldName = configCollectorField.getName();
                        Object configCollectorFieldValue = configCollectorField.get(configCollector);
                        if (configCollectorFieldValue instanceof CollectorEnum) {
                            log.info("collector: " + configCollectorFieldName);
                            pageCollector.clickCollectorSe();
                            pageCollector.setCollectorOption((LimitedEnum) configCollectorFieldValue);
                        }
                    }
                    continue;
                }

                Field monitorsEditPageField = monitorsEditPageClass.getDeclaredField(monitorsEditConfigFieldName);
                monitorsEditPageField.setAccessible(true);
                By by = (By) monitorsEditPageField.get(this);
                log.info(monitorsEditPageField + ": " + monitorsEditConfigFieldValue);

                if (monitorsEditConfigFieldValue instanceof Boolean) {
                    // Edit page switch button
                    String attribute = waitForClickable(by).getAttribute("ng-reflect-model");
                    if (attribute != null && !attribute.equals(monitorsEditConfigFieldValue.toString())) {
                        waitForClickable(by).click();
                    }
                    continue;
                }

                if (monitorsEditConfigFieldValue != null) {
                    this.sendKeysAction(by, monitorsEditConfigFieldValue.toString());
                }
            } catch (IllegalAccessException | NoSuchFieldException e) {
                log.error("No matching monitors configuration parameter.");
            }
        }
        return this;
    }

    /**
     * Collector Enum
     */
    public enum CollectorEnum implements LimitedEnum {
        DEFAULT_SYSTEM_DISPATCH("Default System Dispatch"),
        MAIN_DEFAULT_COLLECTOR("main-default-collector");

        private final String desc;

        CollectorEnum(String desc) {
            this.desc = desc;
        }

        @Override
        public String getDesc() {
            return desc;
        }

        @Override
        public int getLength() {
            return values().length;
        }
    }

    /**
     * Limited Enum
     */
    public interface LimitedEnum {
        String getDesc();

        int getLength();

        int ordinal();
    }

}
