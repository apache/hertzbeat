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

package org.apache.hertzbeat.collector.collect.nebulagraph;

import com.vesoft.nebula.client.graph.NebulaPoolConfig;
import com.vesoft.nebula.client.graph.data.HostAddress;
import com.vesoft.nebula.client.graph.data.ResultSet;
import com.vesoft.nebula.client.graph.data.ValueWrapper;
import com.vesoft.nebula.client.graph.exception.IOErrorException;
import com.vesoft.nebula.client.graph.net.NebulaPool;
import com.vesoft.nebula.client.graph.net.Session;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.common.entity.job.protocol.NgqlProtocol;

/**
 * template for connect nebula graph and execute ngql
 */
@Slf4j
public class NebulaTemplate {

    private String spaceName;
    private Session session;
    NebulaPool pool;

    public void closeSessionAndPool() {
        if (session != null && session.ping()) {
            session.close();
        }
        if (pool != null) {
            pool.close();
        }
    }

    @SneakyThrows
    public boolean initSession(NgqlProtocol protocol) {
        HostAddress hostAddress = new HostAddress(protocol.getHost(), Integer.parseInt(protocol.getPort()));
        this.spaceName = protocol.getSpaceName();
        pool = new NebulaPool();

        NebulaPoolConfig nebulaPoolConfig = new NebulaPoolConfig();
        nebulaPoolConfig.setMaxConnSize(100);
        nebulaPoolConfig.setTimeout(Integer.parseInt(protocol.getTimeout()));
        boolean initResult = pool
            .init(Collections.singletonList(hostAddress), nebulaPoolConfig);
        if (!initResult) {
            log.error("pool init failed.");
            return false;
        }
        session = pool.getSession(protocol.getUsername(), protocol.getPassword(), false);
        return true;
    }

    private ResultSet execute(String ngql) {
        ResultSet resultSet;
        try {
            resultSet = session.execute(ngql);
            return resultSet;
        } catch (IOErrorException e) {
            log.error("Query error:【{}】,ErrorMsg:【{}】", ngql, e.getMessage());
            session.close();
        }
        return null;
    }

    /**
     * Execute ngql query using the graph space name configured in the protocol
     *
     * @param ngql ngql
     */
    public List<Map<String, Object>> executeCommand(String ngql) {
        return executeCommand(ngql, spaceName);
    }

    public List<Map<String, Object>> executeCommand(String ngql, String currentSpaceName) {
        if (StringUtils.isNotBlank(currentSpaceName)) {
            ngql = "USE " + currentSpaceName + ";" + ngql;
        }
        ResultSet resultSet = execute(ngql);
        if (resultSet == null) {
            log.error("Query Error result set is null,NGQL:【{}】", ngql);
            return Collections.emptyList();
        }
        List<String> columnNames = resultSet.getColumnNames();
        List<Map<String, Object>> result = new ArrayList<>();
        int size = resultSet.getRows().size();
        for (int i = 0; i < size; i++) {
            result.add(new LinkedHashMap<>());
        }
        for (String columnName : columnNames) {
            List<ValueWrapper> valueWrappers = resultSet.colValues(columnName);
            for (int i = 0; i < valueWrappers.size(); i++) {
                result.get(i).put(columnName, convert(valueWrappers.get(i)));
            }
        }
        return result;

    }


    @SneakyThrows
    private Object convert(ValueWrapper wrapper) {
        if (wrapper.isBoolean()) {
            return wrapper.asBoolean();
        }
        if (wrapper.isString()) {
            return wrapper.asString();
        }
        if (wrapper.isDate()) {
            return wrapper.asDate();
        }
        if (wrapper.isDateTime()) {
            return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSSS")
                .parse(wrapper.asDateTime().getLocalDateTimeStr().replace("T", " "));
        }
        if (wrapper.isLong()) {
            return wrapper.asLong();
        }
        if (wrapper.isDouble()) {
            return wrapper.asDouble();
        }
        if (wrapper.isPath()) {
            return wrapper.asPath().toString();
        }
        if (wrapper.isEdge()) {
            return wrapper.asRelationship().toString();
        }
        if (wrapper.isVertex()) {
            return wrapper.asNode().toString();
        }
        return null;
    }


}
