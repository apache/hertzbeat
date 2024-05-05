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
import org.apache.hertzbeat.common.entity.job.protocol.NQGLProtocol;

/**
 * template for connect nebula graph and execute ngql
 */
@Slf4j
public class NebulaTemplate {

    private final String userName;
    private final String password;
    private final HostAddress hostAddress;
    private final String spaceName;
    private Session session;

    private final Integer timeout;

    public NebulaTemplate(NQGLProtocol protocol) {
        this.userName = protocol.getUsername();
        this.password = protocol.getPassword();
        this.hostAddress = new HostAddress(protocol.getHost(), Integer.parseInt(protocol.getPort()));
        this.spaceName = protocol.getSpaceName();
        this.timeout = Integer.valueOf(protocol.getTimeout());
        initSession();
    }


    public void closeSession() {
        if (session != null && session.ping()) {
            session.close();
        }
    }

    @SneakyThrows
    private void initSession() {
        NebulaPool pool = new NebulaPool();
        try {
            NebulaPoolConfig nebulaPoolConfig = new NebulaPoolConfig();
            nebulaPoolConfig.setMaxConnSize(100);
            nebulaPoolConfig.setTimeout(timeout);
            boolean initResult = pool
                .init(Collections.singletonList(hostAddress), nebulaPoolConfig);
            if (!initResult) {
                log.error("pool init failed.");
                return;
            }
            session = pool.getSession(userName, password, false);

        } catch (Exception e) {
            log.error("初始化失败");
        }
    }

    private ResultSet execute(String ngQL) {
        ResultSet resultSet;
        try {
            resultSet = session.execute(ngQL);
            return resultSet;
        } catch (IOErrorException e) {
            log.error("Query error:【{}】,ErrorMsg:【{}】", ngQL, e.getMessage());
            session.close();
        }
        return null;
    }

    /**
     * Execute ngql query using the graph space name configured in the protocol
     *
     * @param ngQL ngql
     */
    public List<Map<String, Object>> executeCommand(String ngQL) {
        return executeCommand(ngQL, spaceName);
    }

    public List<Map<String, Object>> executeCommand(String ngQL, String currentSpaceName) {
        if (StringUtils.isNotBlank(currentSpaceName)) {
            ngQL = "USE " + currentSpaceName + ";" + ngQL;
        }
        ResultSet resultSet = execute(ngQL);
        if (resultSet == null) {
            log.error("Query Error result set is null,NGQL:【{}】", ngQL);
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
