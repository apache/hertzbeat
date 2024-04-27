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

package org.apache.hertzbeat.collector.collect.http.promethus;

import java.util.List;
import org.apache.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;

/**
 * prometheus parse abstract class
 * todo: parse response formats for string and scalar types
 */
public abstract class AbstractPrometheusParse {

    /**
     * Downstream node
     */
    private AbstractPrometheusParse prometheusParse;

    AbstractPrometheusParse() {
    }

    public AbstractPrometheusParse setInstance(AbstractPrometheusParse prometheusParse) {
        this.prometheusParse = prometheusParse;
        return this;
    }

    /**
     * checks the Prometheus response type: string, matrix, vector, scalar
     * todo：implementation for string and scalar types is missing
     * @param responseStr The returned string
     * @return boolean indicating the result
     */
    abstract Boolean checkType(String responseStr);

    /**
     * Parse the prom interface response data
     * @param resp The returned data
     * @param aliasFields alias fields
     * @param http httpProtocol
     * @param builder builder
     */
    abstract void parse(String resp, List<String> aliasFields, HttpProtocol http,
                        CollectRep.MetricsData.Builder builder);

    /**
     * Processing prom interface response data
     * @param resp resp
     * @param aliasFields alias fields
     * @param http http
     * @param builder builder
     */
    public void handle(String resp, List<String> aliasFields, HttpProtocol http,
                       CollectRep.MetricsData.Builder builder) {
        if (checkType(resp)) {
            parse(resp, aliasFields, http,
                    builder);
        } else {
            prometheusParse.handle(resp, aliasFields, http,
                    builder);
        }
    }


}
