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

package org.apache.hertzbeat.automated.testing.pages.monitoring;

import org.apache.commons.lang3.ThreadUtils;
import org.apache.hertzbeat.automated.testing.common.ByBuilder;
import org.apache.hertzbeat.automated.testing.common.PageInfo;
import org.apache.hertzbeat.automated.testing.pages.navigation.NavBarPage;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.remote.RemoteWebDriver;

import java.time.Duration;

import static org.apache.hertzbeat.automated.testing.common.SelectorTypeEnum.CSS;
import static org.apache.hertzbeat.automated.testing.pages.navigation.NavBarPage.MONITORS;

/**
 * Monitors Nav-Page
 */
@PageInfo(
        selector = MONITORS,
        selectorType = CSS,
        urlPart = "/monitors"
)
public class MonitorsNavPage extends NavBarPage implements NavBarPage.NavBarTab {

    public By syncBtn = By.xpath("//button[.//i[@nztype='sync']]");
    public By newMonitorBtn = By.xpath("//button[.//i[@nztype='appstore-add']]");
    public By otherMonitorBtn = By.xpath("//button[@class='ant-btn ant-dropdown-trigger ant-btn-icon-only ng-star-inserted']/span[@nz-icon]");
    public By allStatusSe = By.xpath("//nz-select-item[@title='All Status' or @title='Up' or @title='Down' or @title='Paused']");
    public By typeFilterInput = By.xpath("//input[@placeholder='Type Filter']");
    public By labelFilterInput = By.xpath("//input[@placeholder='Label Filter']");
    public By searchMonitorInput = By.xpath("//input[@placeholder='Search Monitor']");
    public By searchBtn = By.xpath("//button/span[contains(text(), 'Search')]");

    // Monitor task list page
    public ByBuilder taskNameBtn = (taskName) -> By.xpath(String.format("//span[text()=' %s ']", taskName.trim()));

    public MonitorsNavPage(RemoteWebDriver driver) {
        super(driver);
    }

    public MonitorsNavPage clickSyncBtn() {
        waitForClickable(syncBtn).click();
        return this;
    }

    public MonitorsNavPage clickNewMonitorBtn(String monitorType) {
        new SearchMonitorType(newMonitorBtn, monitorType);
        return this;
    }

    public MonitorsNavPage clickOtherMonitorBtn(OtherMonitorEnum otherMonitorEnum) {
        new OtherMonitor().setOtherMonitorOption(otherMonitorEnum);
        return this;
    }

    public MonitorsNavPage clickAllStatusSe(AllStatusEnum allStatusEnum) {
        new AllStatus().setAllStatusOption(allStatusEnum);
        return this;
    }

    public MonitorsNavPage clickTypeFilterInput(String monitorType) {
        new SearchMonitorType(typeFilterInput, monitorType);
        return this;
    }

    public MonitorsNavPage clickLabelFilterInput(String label) {
        sendKeys(labelFilterInput, label);
        return this;
    }

    public MonitorsNavPage clickSearchMonitorInput(String monitor) {
        sendKeys(searchMonitorInput, monitor);
        return this;
    }

    public MonitorsNavPage clickSearchBtn() {
        waitForClickable(searchBtn).click();
        waitForClickable(searchBtn);
        return this;
    }

    public MonitorsNavPage clickTaskNameBtn(String taskName) {
        clickAction(taskNameBtn.buildBy(taskName));
        return this;
    }

    @Override
    public <T> T goToInnerTab(Class<T> clazz) {
        return super.goToTab(clazz);
    }

    public <T extends MonitorsNavPage> T forcedSleepWait(int seconds) {
        ThreadUtils.sleepQuietly(Duration.ofSeconds(seconds));
        return (T) this;
    }

    private class SearchMonitorType{
        public By searchMonitorTypeInput = By.xpath("//input[@nz-input and @type='search']");
        public By searchMonitorFirstType = By.xpath("//span[text()='AUTO']");
        public ByBuilder addMonitorTypeInput = (monitorType) -> By.xpath(
                String.format("//span[@class='ant-menu-title-content']/span[@class='label' and contains(@title, '%s')]", monitorType));

        public SearchMonitorType(By typeBy, String monitorType) {
            waitForClickable(typeBy).click();
            WebElement searchMonitorTypeInputElement = waitForClickable(searchMonitorTypeInput);
            waitForVisibility(searchMonitorFirstType);
            searchMonitorTypeInputElement.sendKeys(monitorType);
            waitForClickable(addMonitorTypeInput.buildBy(monitorType)).click();
        }
    }

    private class OtherMonitor{
        private final By otherMonitorItems = By.xpath("//div[@class='cdk-overlay-pane']/div/ul/li");

        public OtherMonitor() {
            new Actions(driver).moveToElement(waitForVisibility(otherMonitorBtn)).perform();
        }

        private void setOtherMonitorOption(LimitedEnum limitedEnum) {
            for (int i = 0; i < limitedEnum.getLength(); i++) {
                waitForClickable(By.xpath(
                        String.format("//div[@class='cdk-overlay-pane']/div/ul/li[%d]", i + 1)));
            }
            waitForVisibilityOfAll(otherMonitorItems).get(limitedEnum.ordinal()).click();
        }
    }

    private class AllStatus{
        private final By allStatusItems = By.xpath("//div[@class='cdk-virtual-scroll-content-wrapper']/nz-option-item");

        public AllStatus() {
            clickAction(allStatusSe);
        }

        private void setAllStatusOption(LimitedEnum limitedEnum) {
            for (int i = 0; i < limitedEnum.getLength(); i++) {
                waitForClickable(By.xpath(
                        String.format("//div[@class='cdk-virtual-scroll-content-wrapper']/nz-option-item[%d]", i + 1)));
            }
            waitForVisibilityOfAll(allStatusItems).get(limitedEnum.ordinal()).click();
        }
    }

    /**
     * Other Monitor Enum
     */
    public enum OtherMonitorEnum implements LimitedEnum {
        Resume_Monitor("Resume Monitor"),
        Pause_Monitor("Pause Monitor"),
        Delete_Monitor("Delete Monitor"),
        Export_Monitor("Export Monitor"),
        Import_Monitor("Import Monitor");

        OtherMonitorEnum(String desc) {
        }

        @Override
        public int getLength() {
            return values().length;
        }
    }

    /**
     * All Status Enum
     */
    public enum AllStatusEnum implements LimitedEnum {
        All_Status("All Status"),
        Up("Up"),
        Down("Down"),
        Paused("Paused");

        AllStatusEnum(String desc) {
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
