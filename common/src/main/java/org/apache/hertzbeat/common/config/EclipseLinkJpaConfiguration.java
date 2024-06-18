/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.common.config;

import java.util.HashMap;
import java.util.Map;
import javax.sql.DataSource;
import org.eclipse.persistence.config.PersistenceUnitProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.orm.jpa.JpaBaseConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.JpaProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.orm.jpa.vendor.AbstractJpaVendorAdapter;
import org.springframework.orm.jpa.vendor.EclipseLinkJpaVendorAdapter;
import org.springframework.transaction.jta.JtaTransactionManager;

/**
 * jpa eclipselink impl config
 */
@Configuration
@ConditionalOnProperty(prefix = "spring.datasource", name = "url")
public class EclipseLinkJpaConfiguration extends JpaBaseConfiguration {

    protected EclipseLinkJpaConfiguration(DataSource dataSource, JpaProperties properties, 
                                          ObjectProvider<JtaTransactionManager> jtaTransactionManager) {
        super(dataSource, properties, jtaTransactionManager);
    }

    @Override
    protected AbstractJpaVendorAdapter createJpaVendorAdapter() {
        return new EclipseLinkJpaVendorAdapter();
    }

    @Override
    protected Map<String, Object> getVendorProperties() {
        HashMap<String, Object> map = new HashMap<>(8);
        map.put(PersistenceUnitProperties.DDL_GENERATION, "create-or-extend-tables");
        map.put(PersistenceUnitProperties.SESSION_CUSTOMIZER, "org.apache.hertzbeat.common.config.EclipseLinkCustomizer");
        map.put(PersistenceUnitProperties.ALLOW_NATIVE_SQL_QUERIES, "true");
        map.put(PersistenceUnitProperties.WEAVING, "true");
        return map;
    }
}
