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

package org.dromara.hertzbeat.collector.collect.mongodb;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Optional;

import com.mongodb.MongoServerUnavailableException;
import com.mongodb.MongoTimeoutException;
import com.mongodb.client.ClientSession;
import org.dromara.hertzbeat.collector.collect.common.cache.CacheIdentifier;
import org.dromara.hertzbeat.collector.collect.common.cache.ConnectionCommonCache;
import org.dromara.hertzbeat.collector.collect.common.cache.MongodbConnect;
import org.dromara.hertzbeat.common.util.CommonUtil;
import org.dromara.hertzbeat.collector.dispatch.DispatchConstants;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.MongodbProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.bson.Document;
import org.springframework.util.Assert;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import org.dromara.hertzbeat.collector.collect.AbstractCollect;

import lombok.extern.slf4j.Slf4j;

/**
 * Mongodb single collect
 *
 * @author <a href="mailto:liudonghua123@gmail.com">liudonghua</a>
 * see also https://www.mongodb.com/languages/java,
 * https://www.mongodb.com/docs/manual/reference/command/serverStatus/#metrics
 */
@Slf4j
public class MongodbSingleCollectImpl extends AbstractCollect {

    /**
     * 支持的 mongodb diagnostic 命令，排除internal/deprecated相关的命令
     * 可参考 <a href="https://www.mongodb.com/docs/manual/reference/command/nav-diagnostic/">...</a>,
     * <a href="https://www.mongodb.com/docs/mongodb-shell/run-commands/">...</a>
     * 注意：一些命令需要相应的权限才能执行，否则执行虽然不会报错，但是返回的结果是空的，
     * 详见 <a href="https://www.mongodb.com/docs/manual/reference/built-in-roles/">...</a>
     */
    private static final String[] SUPPORTED_MONGODB_DIAGNOSTIC_COMMANDS = {
            "buildInfo",
            "collStats",
            "connPoolStats",
            "connectionStatus",
            "dbHash",
            "dbStats",
            "explain",
            "features",
            "getCmdLineOpts",
            "getLog",
            "hostInfo",
            "listCommands",
            "profile",
            "serverStatus",
            "top",
            "validateDBMetadata",
    };

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
        try {
            preCheck(metrics);
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
            return;
        }
        // command 命名规则约定为上述 mongodb diagnostic 支持的命令，同时也通过 . 支持子文档
        // 如果 command 不包括 . 则直接执行命令，使用其返回的文档，否则需要先执行 metricsParts[0] 命令，再获取相关的子文档
        // 例如 serverStatus.metrics.operation 支持 serverStatus 命令的 metrics 子文档下面的 operation 子文档
        String[] metricsParts = metrics.getMongodb().getCommand().split("\\.");
        String command = metricsParts[0];
        // 检查 . 分割的第一部分是否是 mongodb diagnostic 支持的命令
        if (Arrays.stream(SUPPORTED_MONGODB_DIAGNOSTIC_COMMANDS).noneMatch(command::equals)) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("unsupported mongodb diagnostic command: " + command);
            return;
        }
        ClientSession clientSession = null;
        try {
            MongoClient mongoClient = getClient(metrics);
            MongoDatabase mongoDatabase = mongoClient.getDatabase(metrics.getMongodb().getDatabase());
            clientSession = mongoClient.startSession();
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            Document document;
            if (metricsParts.length == 1) {
                document = mongoDatabase.runCommand(clientSession, new Document(command, 1));
            } else {
                document = mongoDatabase.runCommand(clientSession, new Document(command, 1));
                for (int i = 1; i < metricsParts.length; i++) {
                    document = (Document) document.get(metricsParts[i]);
                }
            }
            if (document == null) {
                throw new RuntimeException("the document get from command " + metrics.getMongodb().getCommand()  + " is null.");
            }
            fillBuilder(metrics, valueRowBuilder, document);
            builder.addValues(valueRowBuilder.build());
        } catch (MongoServerUnavailableException | MongoTimeoutException unavailableException) {
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            String message = CommonUtil.getMessageFromThrowable(unavailableException);
            builder.setMsg(message);
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            String message = CommonUtil.getMessageFromThrowable(e);
            builder.setMsg(message);
            log.warn(message, e);
        } finally {
            if (clientSession != null) {
                try {
                    clientSession.close();
                } catch (Exception ignored) {}
            }
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_MONGODB;
    }

    /**
     * 使用 metrics 中配置的收集指标以及执行mongodb命令返回的文档，填充 valueRowBuilder
     */
    private void fillBuilder(Metrics metrics, CollectRep.ValueRow.Builder valueRowBuilder, Document document) {
        metrics.getAliasFields().forEach(it -> {
            if (document.containsKey(it)) {
                Object fieldValue = document.get(it);
                if (fieldValue == null) {
                    valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                } else {
                    valueRowBuilder.addColumns(fieldValue.toString());
                }
            } else {
                valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
            }
        });
    }

    /**
     * 检查 metrics 中的 mongodb 连接信息是否完整
     */
    private void preCheck(Metrics metrics) {
        if (metrics == null || metrics.getMongodb() == null) {
            throw new IllegalArgumentException("Mongodb collect must has mongodb params");
        }
        MongodbProtocol mongodbProtocol = metrics.getMongodb();
        Assert.hasText(mongodbProtocol.getCommand(), "Mongodb Protocol command is required.");
        Assert.hasText(mongodbProtocol.getHost(), "Mongodb Protocol host is required.");
        Assert.hasText(mongodbProtocol.getPort(), "Mongodb Protocol port is required.");
        Assert.hasText(mongodbProtocol.getUsername(), "Mongodb Protocol username is required.");
        Assert.hasText(mongodbProtocol.getPassword(), "Mongodb Protocol password is required.");
    }

    /**
     * 通过metrics中的mongodb连接信息获取 
     * mongodb client本身不存在网络调用，和网络链接。对每次采集，我们需要新建session并使用后关闭它
     * mongodb client is thread pool, we need to create the session for each collect
     */
    private MongoClient getClient(Metrics metrics) {
        MongodbProtocol mongodbProtocol = metrics.getMongodb();
        // try to reuse connection
        CacheIdentifier identifier = CacheIdentifier.builder()
                .ip(mongodbProtocol.getHost()).port(mongodbProtocol.getPort())
                .username(mongodbProtocol.getUsername()).password(mongodbProtocol.getPassword()).build();
        Optional<Object> cacheOption = ConnectionCommonCache.getInstance().getCache(identifier, true);
        MongoClient mongoClient = null;
        if (cacheOption.isPresent()) {
            MongodbConnect mongodbConnect = (MongodbConnect) cacheOption.get();
            mongoClient = mongodbConnect.getMongoClient();
        }
        if (mongoClient != null) {
            return mongoClient;
        }
        // 复用失败则新建连接 connect to mongodb
        // 密码可能包含特殊字符，需要使用类似js的encodeURIComponent进行编码，这里使用java的URLEncoder
        String url = String.format("mongodb://%s:%s@%s:%s/%s?authSource=%s", mongodbProtocol.getUsername(),
                URLEncoder.encode(mongodbProtocol.getPassword(), StandardCharsets.UTF_8), mongodbProtocol.getHost(), mongodbProtocol.getPort(),
                mongodbProtocol.getDatabase(), mongodbProtocol.getAuthenticationDatabase());
        mongoClient = MongoClients.create(url);
        MongodbConnect mongodbConnect = new MongodbConnect(mongoClient);
        ConnectionCommonCache.getInstance().addCache(identifier, mongodbConnect, 3600 * 1000L);
        return mongoClient;
    }
}
