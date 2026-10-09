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

package org.apache.hertzbeat.collector.mysql.r2dbc;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring beans for the collector-side MySQL R2DBC route.
 */
@Configuration(proxyBeanMethods = false)
public class MysqlR2dbcConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public SqlGuard mysqlR2dbcSqlGuard() {
        return new SqlGuard();
    }

    @Bean
    @ConditionalOnMissingBean
    public ResultSetMapper mysqlR2dbcResultSetMapper() {
        return new ResultSetMapper();
    }

    @Bean
    @ConditionalOnMissingBean
    public MysqlR2dbcConnectionFactoryProvider mysqlR2dbcConnectionFactoryProvider() {
        return new MysqlR2dbcConnectionFactoryProvider();
    }

    @Bean
    @ConditionalOnMissingBean(MysqlQueryExecutor.class)
    public MysqlQueryExecutor mysqlQueryExecutor(MysqlR2dbcConnectionFactoryProvider connectionFactoryProvider,
                                                 ResultSetMapper resultSetMapper,
                                                 SqlGuard sqlGuard) {
        return new MysqlR2dbcQueryExecutor(connectionFactoryProvider, resultSetMapper, sqlGuard);
    }
}
