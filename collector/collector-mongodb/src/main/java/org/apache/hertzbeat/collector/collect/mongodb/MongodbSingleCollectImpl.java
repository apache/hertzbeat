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

package org.apache.hertzbeat.collector.collect.mongodb;

import static java.util.concurrent.TimeUnit.MILLISECONDS;
import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.MongoServerUnavailableException;
import com.mongodb.MongoTimeoutException;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.collector.collect.AbstractCollect;
import org.apache.hertzbeat.collector.collect.common.cache.CacheIdentifier;
import org.apache.hertzbeat.collector.collect.common.cache.ConnectionCommonCache;
import org.apache.hertzbeat.collector.constants.CollectorConstants;
import org.apache.hertzbeat.collector.dispatch.DispatchConstants;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.MongodbProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.apache.hertzbeat.common.util.CommonUtil;
import org.bson.Document;
import org.springframework.util.Assert;

/**
 * Mongodb single collect
 * see also https://www.mongodb.com/languages/java,
 * https://www.mongodb.com/docs/manual/reference/command/serverStatus/#metrics
 */
@Slf4j
public class MongodbSingleCollectImpl extends AbstractCollect {

    /**
     * mongodb diagnostic commands supported, excluding internal/deprecated related commands
     * can refer to <a href="https://www.mongodb.com/docs/manual/reference/command/nav-diagnostic/">...</a>,
     * <a href="https://www.mongodb.com/docs/mongodb-shell/run-commands/">...</a>
     * Note: Some commands require the corresponding permissions to execute,
     * otherwise the execution will not report an error, but the return result is empty.
     * seeDetails <a href="https://www.mongodb.com/docs/manual/reference/built-in-roles/">...</a>
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

    private final ConnectionCommonCache<CacheIdentifier, MongodbConnect> connectionCommonCache;

    public MongodbSingleCollectImpl() {
        connectionCommonCache = new ConnectionCommonCache<>();
    }

    /**
     * Check that the mongodb connection information in metrics is complete
     */
    @Override
    public void preCheck(Metrics metrics) throws IllegalArgumentException{
        Assert.isTrue(metrics != null && metrics.getMongodb() != null, "Mongodb collect must has mongodb params");
        MongodbProtocol mongodbProtocol = metrics.getMongodb();
        Assert.hasText(mongodbProtocol.getCommand(), "Mongodb Protocol command is required.");
        Assert.hasText(mongodbProtocol.getHost(), "Mongodb Protocol host is required.");
        Assert.hasText(mongodbProtocol.getPort(), "Mongodb Protocol port is required.");
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
        // The command naming convention is the command supported by the above mongodb diagnostic. Support subdocument
        // If the command does not include., execute the command directly and use the document it returns;
        // otherwise, you need to execute the metricsParts[0] command first and then obtain the related subdocument
        // For example serverStatus. Metrics. Operation support serverStatus command the metrics of the following document operation documents
        String[] metricsParts = metrics.getMongodb().getCommand().split("\\.");
        String command = metricsParts[0];
        // Check whether the first part of the. Split is a command supported by the mongodb diagnostic
        if (Arrays.stream(SUPPORTED_MONGODB_DIAGNOSTIC_COMMANDS).noneMatch(command::equals)) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("unsupported mongodb diagnostic command: " + command);
            return;
        }
        MongoClient mongoClient;
        CacheIdentifier identifier = null;
        try {
            identifier = getIdentifier(metrics.getMongodb());
            mongoClient = getClient(metrics, identifier);
            MongoDatabase mongoDatabase = mongoClient.getDatabase(metrics.getMongodb().getDatabase());
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            Document document = mongoDatabase.runCommand(new Document(command, 1));
            for (int i = 1; i < metricsParts.length; i++) {
                document = (Document) document.get(metricsParts[i]);
            }
            if (document == null) {
                throw new RuntimeException("the document get from command " + metrics.getMongodb().getCommand() + " is null.");
            }
            fillBuilder(metrics, valueRowBuilder, document);
            builder.addValues(valueRowBuilder.build());
        } catch (MongoServerUnavailableException | MongoTimeoutException unavailableException) {
            connectionCommonCache.removeCache(identifier);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            String message = CommonUtil.getMessageFromThrowable(unavailableException);
            builder.setMsg(message);
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            String message = CommonUtil.getMessageFromThrowable(e);
            builder.setMsg(message);
            log.warn(message, e);
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_MONGODB;
    }

    /**
     * Populate the valueRowBuilder with the collection metrics configured in Metrics and the documentation returned by executing the mongodb command
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

    public static CacheIdentifier getIdentifier(MongodbProtocol mongodbProtocol){
        // try to reuse connection
        return CacheIdentifier.builder()
                .ip(mongodbProtocol.getHost()).port(mongodbProtocol.getPort())
                .username(mongodbProtocol.getUsername()).password(mongodbProtocol.getPassword()).build();
    }

    /**
     * Obtained from mongodb connection information in metrics
     * The mongodb client itself does not have network calls and network links.
     * For each collection, we need to create a new session and close it after use
     * mongodb client is thread pool, we need to create the session for each collect
     */
    private MongoClient getClient(Metrics metrics, CacheIdentifier identifier) {
        MongodbProtocol mongodbProtocol = metrics.getMongodb();

        Optional<MongodbConnect> cacheOption = connectionCommonCache.getCache(identifier, true);
        MongoClient mongoClient = null;
        if (cacheOption.isPresent()) {
            MongodbConnect mongodbConnect = cacheOption.get();
            mongoClient = mongodbConnect.getConnection();
        }
        if (mongoClient != null) {
            return mongoClient;
        }

        String url = null;
        if (CollectorConstants.MONGO_DB_ATLAS_MODEL.equals(mongodbProtocol.getModel())) {
            if (StringUtils.isBlank(mongodbProtocol.getUsername()) && StringUtils.isBlank(mongodbProtocol.getPassword())) {
                // Anonymous access for MongoDB Atlas
                url = String.format("mongodb+srv://%s/%s", mongodbProtocol.getHost(), mongodbProtocol.getDatabase());
            } else {
                url = String.format("mongodb+srv://%s:%s@%s/%s?authSource=%s", mongodbProtocol.getUsername(),
                        URLEncoder.encode(mongodbProtocol.getPassword(), StandardCharsets.UTF_8), mongodbProtocol.getHost(),
                        mongodbProtocol.getDatabase(), mongodbProtocol.getAuthenticationDatabase());
            }
        } else {
            // If the multiplexing fails, create a new connection to connect to mongodb
            // Passwords may contain special characters and need to be encoded using JS-like encodeURIComponent, which uses java URLEncoder
            if (StringUtils.isBlank(mongodbProtocol.getUsername()) && StringUtils.isBlank(mongodbProtocol.getPassword())) {
                // Anonymous access for standalone MongoDB
                url = String.format("mongodb://%s:%s/%s", mongodbProtocol.getHost(), mongodbProtocol.getPort(),
                        mongodbProtocol.getDatabase());
            } else {
                url = String.format("mongodb://%s:%s@%s:%s/%s?authSource=%s", mongodbProtocol.getUsername(),
                        URLEncoder.encode(mongodbProtocol.getPassword(), StandardCharsets.UTF_8), mongodbProtocol.getHost(), mongodbProtocol.getPort(),
                        mongodbProtocol.getDatabase(), mongodbProtocol.getAuthenticationDatabase());
            }
        }


        // Use the Mongo Client Settings builder to configure timeouts and other configurations
        MongoClientSettings settings = MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(url))
                .applyToClusterSettings(builder ->
                        // Set the timeout period for server selection
                        builder.serverSelectionTimeout(Long.parseLong(mongodbProtocol.getTimeout()), MILLISECONDS))
                .build();

        // CREATE THE MONGO CLIENT USING THE CONFIGURATION
        mongoClient = MongoClients.create(settings);

        MongodbConnect mongodbConnect = new MongodbConnect(mongoClient);
        connectionCommonCache.addCache(identifier, mongodbConnect, 3600 * 1000L);
        return mongoClient;
    }
}
