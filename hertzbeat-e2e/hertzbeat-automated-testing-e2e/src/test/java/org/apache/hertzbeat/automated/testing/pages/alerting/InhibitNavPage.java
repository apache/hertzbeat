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

package org.apache.hertzbeat.automated.testing.pages.alerting;

import org.apache.hertzbeat.automated.testing.common.PageInfo;
import org.apache.hertzbeat.automated.testing.pages.navigation.NavBarPage;
import org.openqa.selenium.remote.RemoteWebDriver;

import static org.apache.hertzbeat.automated.testing.common.SelectorTypeEnum.CSS;
import static org.apache.hertzbeat.automated.testing.pages.navigation.NavBarPage.INHIBIT;

/**
 * Inhibit Nav-Page
 */
@PageInfo(
        selector = INHIBIT,
        selectorType = CSS,
        urlPart = "/alert/inhibit"
)
public class InhibitNavPage extends NavBarPage implements NavBarPage.NavBarTab {

    public InhibitNavPage(RemoteWebDriver driver) {
        super(driver);
    }

    @Override
    public <T> T goToInnerTab(Class<T> clazz) {
        return super.goToTab(clazz);
    }

}
