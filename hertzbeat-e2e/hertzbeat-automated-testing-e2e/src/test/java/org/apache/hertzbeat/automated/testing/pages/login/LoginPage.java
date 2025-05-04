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

package org.apache.hertzbeat.automated.testing.pages.login;

import org.apache.hertzbeat.automated.testing.pages.navigation.NavBarPage;
import org.openqa.selenium.By;
import org.openqa.selenium.Keys;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.remote.RemoteWebDriver;

/**
 * Login Page
 */
public class LoginPage extends NavBarPage {
    private final By usernameInputBy = By.xpath("//*[@id=\"nz-tabs-0-tab-0\"]/nz-form-item[1]/nz-form-control/div/div/app-multi-func-input/nz-input-group/input");
    private final By passwordInputBy = By.xpath("//*[@id=\"nz-tabs-0-tab-0\"]/nz-form-item[2]/nz-form-control/div/div/app-multi-func-input/nz-input-group/input");
    private final By loginButtonBy = By.xpath("//button/span[@class='ng-star-inserted']");
    private final By loginPopup = By.cssSelector("div.ant-modal-body");

    public LoginPage(RemoteWebDriver driver) {
        super(driver);
    }

    private LoginPage enterAccount(String username, String password) {
        sendKeys(usernameInputBy, username);
        sendKeys(passwordInputBy, password);
        return this;
    }

    private NavBarPage clickLoginButton() {
        waitForClickable(loginButtonBy).click();
        waitForClickable(loginButtonBy).click();
        waitForVisibility(loginPopup);
        new Actions(driver).sendKeys(Keys.ESCAPE).perform();
        return new NavBarPage(driver);
    }

    public NavBarPage loginAs(String username, String password) {
        return this.enterAccount(username, password).clickLoginButton();
    }

}
