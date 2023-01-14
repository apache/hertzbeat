package com.usthe.collector.collect.common.cache;

import com.mongodb.client.MongoClient;
import lombok.extern.slf4j.Slf4j;

/**
 * mongodb connect client
 *
 * @author tom
 * @date 2023/1/6 21:48
 */
@Slf4j
public class MongodbConnect implements CacheCloseable {
    private MongoClient mongoClient;

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
            log.error(e.getMessage(), e);
        }
    }

    @Override
    protected void finalize() throws Throwable {
        close();
        super.finalize();
    }

    public MongoClient getMongoClient() {
        return mongoClient;
    }
}
