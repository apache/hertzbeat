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

package org.apache.hertzbeat.collector.collect.sd;

import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.entity.job.protocol.ZookeeperSdProtocol;
import org.apache.hertzbeat.common.entity.sd.ConnectionConfig;
import org.apache.zookeeper.KeeperException;
import org.apache.zookeeper.ZooKeeper;
import org.apache.hertzbeat.common.util.CommonUtil;
import java.io.IOException;
import java.util.List;

/**
 * zookeeper sd collector
 */
@Slf4j
public class ZookeeperSdCollectImpl extends AbstractCollect {

    private static int TIMEOUT = 30000;

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, Metrics metrics) {
        ZookeeperSdProtocol zookeeperSdProtocol = metrics.getZookeeper_sd();
        String url = zookeeperSdProtocol.getUrl();
        String pathPrefix = zookeeperSdProtocol.getPathPrefix();
        try (ZooKeeper zk = new ZooKeeper(url, TIMEOUT, event -> {})){

            List<String> children = zk.getChildren(pathPrefix, false);
            List<ConnectionConfig> connectionConfigs = children.stream().map(node -> {
                String[] split = node.split(":");
                if (split.length != 2) log.warn("Node format is incorrect: {}, expected format is 'host:port'", node);
                return new ConnectionConfig(split[0], split[1]);
            }).toList();
            connectionConfigs.forEach(config -> {
                CollectRep.ValueRow valueRow = CollectRep.ValueRow.newBuilder()
                        .addColumn(config.getHost())
                        .addColumn(config.getPort())
                        .build();
                builder.addValueRow(valueRow);
            });
        } catch (IOException e){
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.error("Failed to connect to Zookeeper: {}", errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } catch (InterruptedException e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.error("Zookeeper connection interrupted: {}", errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } catch (KeeperException e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.error("Zookeeper operation failed: {}", errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        }
    }

    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException {
        if (metrics.getZookeeper_sd() == null) {
            throw new IllegalArgumentException("Zookeeper SD configuration cannot be null");
        }
        if (metrics.getZookeeper_sd().getUrl() == null || metrics.getZookeeper_sd().getUrl().isEmpty()) {
            throw new IllegalArgumentException("Zookeeper URL cannot be null or empty");
        }
        if (metrics.getZookeeper_sd().getPathPrefix() == null || metrics.getZookeeper_sd().getPathPrefix().isEmpty()) {
            throw new IllegalArgumentException("Zookeeper path prefix cannot be null or empty");
        }
    }

    @Override
    public String supportProtocol() {
        return "zookeeper_sd";
    }
}
