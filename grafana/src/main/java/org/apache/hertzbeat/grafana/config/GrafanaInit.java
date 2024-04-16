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

package org.apache.hertzbeat.grafana.config;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.grafana.service.DatasourceService;
import org.apache.hertzbeat.grafana.service.ServiceAccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * grafana init
 */
@Component
@Slf4j
public class GrafanaInit implements CommandLineRunner {
    @Autowired
    private GrafanaConfiguration grafanaConfiguration;
    @Autowired
    private ServiceAccountService serviceAccountService;
    @Autowired
    private DatasourceService datasourceService;

    //1. Determine whether the configuration is filled out completely
    //2. Determine whether there is an account, if not, create and ensure that the account is unique
    //2. Determine whether there is a token, if not, create and ensure that the account is unique.
    @Override
    public void run(String... args) throws Exception {
        if (grafanaConfiguration.isEnabled() && grafanaConfiguration.getUrl() != null && grafanaConfiguration.getUsername() != null && grafanaConfiguration.getPassword() != null) {
            serviceAccountService.reload();
            try {
                serviceAccountService.getAccount();
            } catch (RuntimeException e) {
                log.error("service account is not exist, create service account");
                serviceAccountService.createServiceAccount();
            }
            try {
                serviceAccountService.getToken();
            } catch (RuntimeException e) {
                log.error("service token is not exist, create service token");
                serviceAccountService.createToken();
            }
            datasourceService.deleteDatasource();
            datasourceService.createDatasource();
        }
    }


}
