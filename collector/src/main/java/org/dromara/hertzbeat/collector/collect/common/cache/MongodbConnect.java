package org.dromara.hertzbeat.collector.collect.common.cache;

import com.mongodb.client.MongoClient;
import lombok.extern.slf4j.Slf4j;

/**
 * mongodb connect client
 * @author tom
 */
@Slf4j
public class MongodbConnect implements CacheCloseable {
    private final MongoClient mongoClient;

    public MongodbConnect(MongoClient mongoClient) {
        this.mongoClient = mongoClient;
    }

    @Override
    public void close() {
        try {
            if (this.mongoClient != null) {
                this.mongoClient.close();
            }
        } catch (Exception e) {
            log.error("[connection common cache] close mongodb connect error: {}", e.getMessage());
        }
    }
    public MongoClient getMongoClient() {
        return mongoClient;
    }
}
