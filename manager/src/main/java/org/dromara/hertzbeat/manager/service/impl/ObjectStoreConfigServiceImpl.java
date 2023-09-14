package org.dromara.hertzbeat.manager.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.obs.services.ObsClient;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.formula.functions.T;
import org.dromara.hertzbeat.manager.dao.GeneralConfigDao;
import org.dromara.hertzbeat.manager.pojo.dto.ObjectStoreDTO;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;
import org.springframework.util.Assert;

import javax.annotation.Resource;
import java.lang.reflect.Type;

import static java.util.Objects.nonNull;

/**
 * 文件存储配置服务
 *
 * @author <a href="mailto:gcwm99@gmail.com">gcdd1993</a>
 * Created by gcdd1993 on 2023/9/13
 */
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
@Service
public class ObjectStoreConfigServiceImpl extends AbstractGeneralConfigServiceImpl<ObjectStoreDTO<T>> implements CommandLineRunner {
    @Resource
    private ConfigurableListableBeanFactory beanFactory;

    /**
     * 构造方法，传入GeneralConfigDao、ObjectMapper和type。
     *
     * <p>Constructor, passing in GeneralConfigDao, ObjectMapper and type.</p>
     *
     * @param generalConfigDao 配置Dao对象
     * @param objectMapper     JSON工具类对象
     */
    protected ObjectStoreConfigServiceImpl(GeneralConfigDao generalConfigDao, ObjectMapper objectMapper) {
        super(generalConfigDao, objectMapper);
    }

    @Override
    public String type() {
        return "oss";
    }

    @Override
    protected TypeReference<ObjectStoreDTO<T>> getTypeReference() {
        return new TypeReference<>() {
            @Override
            public Type getType() {
                return ObjectStoreDTO.class;
            }
        };
    }

    @Override
    public void handler(ObjectStoreDTO<T> config) {
        // 初始化文件存储服务
        switch (config.getType()) {
            case OBS:
                initObs(config);
                break;
            // case other object store service
        }
    }

    /**
     * 初始化华为云OBS
     */
    private void initObs(ObjectStoreDTO<T> config) {
        var obsConfig = objectMapper.convertValue(config.getConfig(), ObjectStoreDTO.ObsConfig.class);
        Assert.hasText(obsConfig.getAccessKey(), "cannot find obs accessKey");
        Assert.hasText(obsConfig.getSecretKey(), "cannot find obs secretKey");
        Assert.hasText(obsConfig.getEndpoint(), "cannot find obs endpoint");
        Assert.hasText(obsConfig.getBucketName(), "cannot find obs bucket name");

        var obsClient = new ObsClient(obsConfig.getAccessKey(), obsConfig.getSecretKey(), obsConfig.getEndpoint());

        beanFactory.registerSingleton("ObjectStoreService", new ObsObjectStoreServiceImpl(obsClient, obsConfig.getBucketName(), obsConfig.getSavePath()));

        log.info("obs store service init success.");
    }

    @Override
    public void run(String... args) throws Exception {
        // 初始化文件存储
        var config = getConfig();
        if (nonNull(config)) {
            initObs(config);
        }
    }
}
