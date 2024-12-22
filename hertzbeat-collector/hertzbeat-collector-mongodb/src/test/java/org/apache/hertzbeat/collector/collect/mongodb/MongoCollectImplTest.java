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
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.apache.hertzbeat.common.entity.job.Metrics;
import org.apache.hertzbeat.common.entity.job.protocol.MongodbProtocol;
import org.apache.hertzbeat.common.entity.message.CollectRep;
import org.bson.Document;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;


/**
 * Test case for {@link MongodbSingleCollectImpl}
 */
@ExtendWith(MockitoExtension.class)
public class MongoCollectImplTest {

    @Mock
    MongodbProtocol mongodbProtocol;
    @Mock
    MongoClient mongoClient;

    @Mock
    MongoDatabase mongoDatabase;

    @InjectMocks
    MongodbSingleCollectImpl mongodbSingleCollect;

    @BeforeEach
    void setUp() {
        mongodbProtocol = MongodbProtocol.builder()
                .host("127.0.0.1")
                .port("5000")
                .username("Administrator")
                .password("Password")
                .timeout("5000")
                .database("test")
                .authenticationDatabase("admin")
                .build();
    }

    @Test
    void mockTest() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        mongodbProtocol.setCommand("hostInfo.os");
        Metrics metrics = new Metrics();
        metrics.setAliasFields(List.of("type", "name", "version"));
        metrics.setMongodb(mongodbProtocol);
        String osInfo = """
                {
                "os" :
                    {
                        "type" : "Linux",
                        "name" : "Ubuntu",
                        "version" : "22.04"
                    }
                }""";
        Mockito.when(mongoDatabase.runCommand(new Document("hostInfo", 1))).thenReturn(Document.parse(osInfo));
        Mockito.when(mongoClient.getDatabase("test")).thenReturn(mongoDatabase);
        MockedStatic<MongoClients> mongoClientsMockedStatic = Mockito.mockStatic(MongoClients.class);
        String url = String.format("mongodb://%s:%s@%s:%s/%s?authSource=%s", mongodbProtocol.getUsername(),
                URLEncoder.encode(mongodbProtocol.getPassword(), StandardCharsets.UTF_8), mongodbProtocol.getHost(), mongodbProtocol.getPort(),
                mongodbProtocol.getDatabase(), mongodbProtocol.getAuthenticationDatabase());
        MongoClientSettings settings = MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(url))
                .applyToClusterSettings(b ->
                        b.serverSelectionTimeout(Long.parseLong(mongodbProtocol.getTimeout()), MILLISECONDS))
                .build();
        mongoClientsMockedStatic.when(() -> MongoClients.create(settings)).thenReturn(mongoClient);
        mongodbSingleCollect.preCheck(metrics);
        mongodbSingleCollect.collect(builder, metrics);
        Assertions.assertEquals("Linux", builder.getValues(0).getColumns(0));
        Assertions.assertEquals("Ubuntu", builder.getValues(0).getColumns(1));
        Assertions.assertEquals("22.04", builder.getValues(0).getColumns(2));
    }
}
