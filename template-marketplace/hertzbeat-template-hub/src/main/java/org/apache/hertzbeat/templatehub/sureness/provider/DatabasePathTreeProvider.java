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

package org.apache.hertzbeat.templatehub.sureness.provider;

import com.usthe.sureness.matcher.PathTreeProvider;
import com.usthe.sureness.util.SurenessCommonUtil;
import org.apache.hertzbeat.templatehub.service.ResourceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Set;

/**
 * ths provider provides path resources
 * load sureness config resource form database
 * @author tomsun28
 * @date 16:00 2019-08-04
 */
@Component
public class DatabasePathTreeProvider implements PathTreeProvider {

    @Autowired
    private ResourceService resourceService;

    @Override
    public Set<String> providePathData() {
        // Read path information from the database and retrieve all path information with a status of 1, which is normal
        Set<String> pathSet = SurenessCommonUtil.attachContextPath(getContextPath(), resourceService.getAllEnableResourcePath());
        return pathSet;

    }

    @Override
    public Set<String> provideExcludedResource() {
        // Read path information from the database and retrieve all path information with a status of 9, which is disabled
        Set<String> exlResourceSet = SurenessCommonUtil.attachContextPath(getContextPath(), resourceService.getAllDisableResourcePath());
        return exlResourceSet;
    }

}
