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

package com.usthe.collector.collect.mongodb;

import com.usthe.collector.collect.AbstractCollect;
import com.usthe.collector.collect.common.cache.CacheIdentifier;
import com.usthe.collector.collect.common.cache.CommonCache;
import com.usthe.collector.dispatch.DispatchConstants;
import com.usthe.collector.util.CollectUtil;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.MongodbProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.entity.message.CollectRep.MetricsData.Builder;
import com.usthe.common.util.CommonConstants;
import com.mongodb.*;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.result.*;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.client.utils.URIUtils;
import org.apache.http.client.utils.URLEncodedUtils;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;
import org.bson.Document;
import org.springframework.web.util.UriUtils;

import java.time.Duration;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Mongodb 单机指标收集器
 *
 * @author <a href="mailto:liudonghua123@gmail.com">liudonghua</a>
 * @version 1.0
 *          Created by liudonghua on 2023/01/01
 *          see also https://www.mongodb.com/languages/java,
 *          https://www.mongodb.com/docs/manual/reference/command/serverStatus/#metrics
 */
@Slf4j
public class MongodbSingleCollectImpl extends AbstractCollect {
    @Override
    public void collect(Builder builder, long appId, String app, Metrics metrics) {
        try {
            preCheck(metrics);
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
            return;
        }
        MongoClient mongoClient = getClient(metrics);
        MongoDatabase mongoDatabase = mongoClient.getDatabase(metrics.getMongodb().getDatabase());
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        if (metrics.getName().startsWith("serverStatus")) {
            // https://www.mongodb.com/docs/manual/reference/command/serverStatus/#metrics
            Document serverStatus = mongoDatabase.runCommand(new Document("serverStatus", 1));
            // the name of metrics is like serverStatus.metrics.document, split it and get the related sub document
            String[] metricsParts = metrics.getName().split("\\.");
            Document metricsDocument = serverStatus;
            for(int i = 1; i < metricsParts.length; i++) {
                metricsDocument = (Document) metricsDocument.get(metricsParts[i]);
            }
            fillBuilder(metrics, valueRowBuilder, metricsDocument);
        }
        else if(metrics.getName().equals("buildInfo")) {
            // https://www.mongodb.com/docs/manual/reference/command/buildInfo/#usage
            Document buildInfo = mongoDatabase.runCommand(new Document("buildInfo", 1));
            fillBuilder(metrics, valueRowBuilder, buildInfo);
        }
        builder.addValues(valueRowBuilder.build());
    }

    private void fillBuilder(Metrics metrics, CollectRep.ValueRow.Builder valueRowBuilder, Document document) {
        metrics.getAliasFields().forEach(it -> {
            if (document.containsKey(it)) {
                Object fieldValue =document.get(it);
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

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_MONGODB;
    }

    /**
     * preCheck params
     */
    private void preCheck(Metrics metrics) {
        if (metrics == null || metrics.getMongodb() == null) {
            throw new IllegalArgumentException("Mongodb collect must has mongodb params");
        }
        MongodbProtocol mongodbProtocol = metrics.getMongodb();
        Assert.hasText(mongodbProtocol.getHost(), "Mongodb Protocol host is required.");
        Assert.hasText(mongodbProtocol.getPort(), "Mongodb Protocol port is required.");
        Assert.hasText(mongodbProtocol.getUsername(), "Mongodb Protocol username is required.");
        Assert.hasText(mongodbProtocol.getPassword(), "Mongodb Protocol password is required.");
    }

    private MongoClient getClient(Metrics metrics) {
        MongodbProtocol mongodbProtocol = metrics.getMongodb();
        // connect to mongodb
        String url = null;
        try {
            url = String.format("mongodb://%s:%s@%s:%s/%s?authSource=%s", mongodbProtocol.getUsername(),
                    URLEncoder.encode(mongodbProtocol.getPassword(), "UTF-8"), mongodbProtocol.getHost(), mongodbProtocol.getPort(),
                    mongodbProtocol.getDatabase(), mongodbProtocol.getAuthenticationDatabase());
        } catch (UnsupportedEncodingException e) {
            throw new RuntimeException(e);
        }
        MongoClient mongoClient = MongoClients.create(url);
        return mongoClient;
    }
}
