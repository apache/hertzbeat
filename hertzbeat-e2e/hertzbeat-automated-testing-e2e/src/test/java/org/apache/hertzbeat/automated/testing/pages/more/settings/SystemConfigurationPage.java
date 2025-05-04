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

package org.apache.hertzbeat.automated.testing.pages.more.settings;

import org.apache.commons.lang3.ThreadUtils;
import org.apache.hertzbeat.automated.testing.common.PageInfo;
import org.apache.hertzbeat.automated.testing.pages.more.SettingsNavPage;
import org.openqa.selenium.By;
import org.openqa.selenium.remote.RemoteWebDriver;

import java.time.Duration;

import static org.apache.hertzbeat.automated.testing.common.SelectorTypeEnum.XPATH;
import static org.apache.hertzbeat.automated.testing.pages.more.SettingsNavPage.SYSTEM_CONFIGURATION;

/**
 * System Configuration Page
 */
@PageInfo(
        selector = SYSTEM_CONFIGURATION,
        selectorType = XPATH,
        urlPart = "/setting/settings/config"
)
public class SystemConfigurationPage extends SettingsNavPage implements SettingsNavPage.InnerTab{

    private final By systemLanguageSe = By.xpath("//div[@class='left']/form/se[1]/div[2]");
    private final By systemLanguageSeText = By.xpath("//div[@class='left']/form/se[1]/div[2]//nz-select-item[@title]");
    private final By systemTimeZoneSe = By.xpath("//div[@class='left']/form/se[2]/div[2]");
    private final By systemThemeSe = By.xpath("//div[@class='left']/form/se[3]/div[2]");
    private final By confirmUpdateBtn = By.xpath("//div[@class='left']/form/se[4]/div[2]//button/span[@class='ng-star-inserted']");

    private Boolean clickConfirmUpdateBtnMark = false;

    public SystemConfigurationPage(RemoteWebDriver driver) {
        super(driver);
    }

    public SystemConfigurationPage setSystemDefaultLanguage() {
        clickConfirmUpdateBtnMark = waitForVisibility(systemLanguageSeText).getText().contains("English");
        return clickConfirmUpdateBtnMark ? this : setSystemLanguage(SystemLanguageEnum.English);
    }

    public SystemConfigurationPage setSystemLanguage(SystemLanguageEnum systemLanguage) {
        new SysSelect(systemLanguageSe).setSystemConfigurationOption(systemLanguage);
        return this;
    }

    public SystemConfigurationPage setSystemTimeZone(SystemTimeZoneEnum systemTimeZone) {
        new SysSelect(systemTimeZoneSe).setSystemConfigurationOption(systemTimeZone);
        return this;
    }

    public SystemConfigurationPage setSystemTheme(SystemThemeEnum systemTheme) {
        new SysSelect(systemThemeSe).setSystemConfigurationOption(systemTheme);
        return this;
    }

    public SystemConfigurationPage confirmUpdate() {
        if (clickConfirmUpdateBtnMark) {
            return this;
        }
        waitForClickable(confirmUpdateBtn).click();
        /* Switching system languages and other operations, reloading and rendering pages,
         * time-consuming operations, forced waiting.
         */
        ThreadUtils.sleepQuietly(Duration.ofSeconds(2));
        waitForClickable(confirmUpdateBtn);
        return this;
    }

    private class SysSelect{
        private final By sysSelectItems = By.xpath("//cdk-virtual-scroll-viewport/div[1]/nz-option-item/div");

        public SysSelect(By seBy) {
            clickAction(seBy);
        }

        private void setSystemConfigurationOption(LimitedEnum limitedEnum) {
            for (int i = 0; i < limitedEnum.getLength(); i++) {
                waitForClickable(By.xpath(
                        String.format("//cdk-virtual-scroll-viewport/div[1]/nz-option-item[%d]/div", i + 1)));
            }
            waitForVisibilityOfAll(sysSelectItems).get(limitedEnum.ordinal()).click();
        }
    }

    /**
     * System Language Enum
     */
    public enum SystemLanguageEnum implements LimitedEnum{
        English("English(en_US)"),
        SIMPLIFIED_CHINESE("Simplified Chinese(zh_CN)"),
        TRADITIONAL_CHINESE("Traditional Chinese(zh_TW)"),
        JAPANESE("Japanese(ja_JP)"),
        PORTUGUESE("Portuguese(pt_BR)");

        SystemLanguageEnum(String desc) {
        }

        @Override
        public int getLength() {
            return values().length;
        }
    }

    /**
     * System Time Zone Enum
     */
    public enum SystemTimeZoneEnum implements LimitedEnum{
        PACIFIC_PAGO_PAGO("Pacific/Pago_Pago(UTC-11:00)"),
        PACIFIC_TAHITI("Pacific/Tahiti(UTC-10:00)"),
        PACIFIC_GAMBIER("Pacific/Gambier(UTC-09:00)"),
        AMERICA_NOME("America/Nome(UTC-08:00)"),
        AMERICA_PHOENIX("America/Phoenix(UTC-07:00)");
        // ......

        SystemTimeZoneEnum(String desc) {
        }

        @Override
        public int getLength() {
            return values().length;
        }
    }

    /**
     * System Theme Enum
     */
    public enum SystemThemeEnum implements LimitedEnum{
        Default_Theme("Default Theme"),
        DARK_THEME("Dark Theme"),
        COMPACT_THEME("Compact Theme");

        SystemThemeEnum(String desc) {
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
        int getLength();

        int ordinal();
    }

}
