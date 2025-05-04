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

package org.apache.hertzbeat.automated.testing.pages.navigation;

import org.apache.hertzbeat.automated.testing.common.PageInfo;
import org.apache.hertzbeat.automated.testing.common.SelectorTypeEnum;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.remote.RemoteWebDriver;
import org.openqa.selenium.support.ui.ExpectedCondition;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * Navigation bar component page
 */
public class NavBarPage {

    public final RemoteWebDriver driver;

    public static final String DASHBOARD = "a.sidebar-nav__item-link[data-id='2']";
    public static final String MONITORS = "a.sidebar-nav__item-link[data-id='4']";
    public static final String BULLETIN = "a.sidebar-nav__item-link[data-id='5']";
    public static final String TEMPLATE = "a.sidebar-nav__item-link[data-id='6']";
    public static final String THRESHOLD = "a.sidebar-nav__item-link[data-id='21']";
    public static final String INTEGRATION = "a.sidebar-nav__item-link[data-id='22']";
    public static final String GROUP = "a.sidebar-nav__item-link[data-id='23']";
    public static final String INHIBIT = "a.sidebar-nav__item-link[data-id='24']";
    public static final String SILENCE = "a.sidebar-nav__item-link[data-id='25']";
    public static final String ALARMS = "a.sidebar-nav__item-link[data-id='26']";
    public static final String NOTIFICATION = "a.sidebar-nav__item-link[data-id='27']";
    public static final String STATUS = "a.sidebar-nav__item-link[data-id='29']";
    public static final String COLLECTOR = "a.sidebar-nav__item-link[data-id='30']";
    public static final String LABELS = "a.sidebar-nav__item-link[data-id='31']";
    public static final String PLUGINS = "a.sidebar-nav__item-link[data-id='32']";
    public static final String SETTINGS = "a.sidebar-nav__item-link[data-id='34']";
    public static final String HELP = "a.sidebar-nav__item-link[data-id='35']";
    public static final String EMPTY = "";

    public NavBarPage(RemoteWebDriver driver) {
        this.driver = driver;
    }

    public WebElement waitForPresence(By anyBy) {
        return new WebDriverWait(driver, Duration.ofSeconds(10)).until(ExpectedConditions.presenceOfElementLocated(anyBy));
    }

    public List<WebElement> waitForPresenceOfAll(By anyBy) {
        return new WebDriverWait(driver, Duration.ofSeconds(10)).until(ExpectedConditions.presenceOfAllElementsLocatedBy(anyBy));
    }

    public WebElement waitForVisibility(By anyBy) {
        return new WebDriverWait(driver, Duration.ofSeconds(10)).until(ExpectedConditions.visibilityOfElementLocated(anyBy));
    }

    public List<WebElement> waitForVisibilityOfAll(By anyBy) {
        return new WebDriverWait(driver, Duration.ofSeconds(10)).until(ExpectedConditions.visibilityOfAllElementsLocatedBy(anyBy));
    }

    public WebElement waitForClickable(By anyBy) {
        waitForPresence(anyBy);
        waitForVisibility(anyBy);
        return new WebDriverWait(driver, Duration.ofSeconds(10)).until(ExpectedConditions.elementToBeClickable(anyBy));
    }

    public WebElement waitForClickable(WebElement webElement) {
        return new WebDriverWait(driver, Duration.ofSeconds(10)).until(ExpectedConditions.elementToBeClickable(webElement));
    }

    public void waitForPageLoading(String[] urlPart) {
        new WebDriverWait(driver, Duration.ofSeconds(10)).until(ExpectedConditions.or(
                Arrays.stream(urlPart)
                        .map(ExpectedConditions::urlContains)
                        .toArray(ExpectedCondition[]::new))
        );
    }

    public void clickTab(String selector, SelectorTypeEnum selectorType, String[] urlPart) {
        switch (selectorType) {
            case CSS -> waitForClickable(By.cssSelector(selector)).click();
            case XPATH -> waitForClickable(By.xpath(selector)).click();
            case ID -> waitForClickable(By.id(selector)).click();
            case CLASS_NAME -> waitForClickable(By.className(selector)).click();
            default -> {
            }
        }
        waitForPageLoading(urlPart);
    }

    public <T> T goToTab(Class<T> clazz) {
        PageInfo pageInfo = clazz.getAnnotation(PageInfo.class);
        if (pageInfo != null) {
            String selector = pageInfo.selector();
            SelectorTypeEnum selectorType = pageInfo.selectorType();
            String[] urlPart = pageInfo.urlPart();
            if (selector != null && selectorType != null && urlPart != null) {
                clickTab(selector, selectorType, urlPart);
                try {
                    Constructor<T> constructor = clazz.getDeclaredConstructor(RemoteWebDriver.class);
                    constructor.setAccessible(true);
                    return constructor.newInstance(driver);
                } catch (NoSuchMethodException | InstantiationException | InvocationTargetException | IllegalAccessException e) {
                    throw new RuntimeException(e);
                }
            }
        } else {
            throw new IllegalArgumentException("Unknown page object type");
        }
        return null;
    }

    public void refresh() {
        driver.navigate().refresh();
    }

    public void clickAction(By anyBy) {
        new Actions(driver).moveToElement(waitForClickable(anyBy)).click().perform();
    }

    public void sendKeys(By anyBy, String keys) {
        WebElement webElement = waitForVisibility(anyBy);
        webElement.clear();
        webElement.sendKeys(keys);
    }

    public void sendKeysAction(By anyBy, String keys) {
        WebElement webElement = waitForVisibility(anyBy);
        new Actions(driver)
                .moveToElement(webElement)
                .click()
                .keyDown(webElement, Keys.CONTROL)
                .sendKeys("a")
                .keyUp(webElement, Keys.CONTROL)
                .sendKeys(Keys.BACK_SPACE)
                .sendKeys(keys)
                .perform();
    }

    public void scrollDownPage(Integer deltaY) {
        new Actions(driver).scrollByAmount(0, Objects.requireNonNullElse(deltaY, Integer.MAX_VALUE)).perform();
    }

    /**
     * NavBarTab interface
     */
    public interface NavBarTab {
        <T> T goToInnerTab(Class<T> clazz);

        /**
         * InnerTab sub interface
         */
        public interface InnerTab {
        }
    }

}
