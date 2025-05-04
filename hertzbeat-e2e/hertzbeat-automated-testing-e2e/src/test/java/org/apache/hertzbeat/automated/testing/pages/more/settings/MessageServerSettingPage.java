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

import org.apache.hertzbeat.automated.testing.common.PageInfo;
import org.apache.hertzbeat.automated.testing.pages.more.SettingsNavPage;
import org.openqa.selenium.remote.RemoteWebDriver;

import static org.apache.hertzbeat.automated.testing.common.SelectorTypeEnum.XPATH;
import static org.apache.hertzbeat.automated.testing.pages.more.SettingsNavPage.MESSAGE_SERVER_SETTING;

/**
 * Message Server Setting Page
 */
@PageInfo(
        selector = MESSAGE_SERVER_SETTING,
        selectorType = XPATH,
        urlPart = "/setting/settings/server"
)
public class MessageServerSettingPage extends SettingsNavPage implements SettingsNavPage.InnerTab{

    public MessageServerSettingPage(RemoteWebDriver driver) {
        super(driver);
    }

}
