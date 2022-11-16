package com.usthe.collector.collect.strategy;

import com.usthe.collector.collect.AbstractCollect;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;

import java.util.ServiceLoader;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Specific metrics collection factory
 * 数据收集策略工厂
 * @author myth
 * @date 2022/7/20 16:19
 */
@Configuration
public class CollectStrategyFactory implements CommandLineRunner {

    /**
     * strategy container 策略容器
     */
    private static final ConcurrentHashMap<String, AbstractCollect> COLLECT_STRATEGY = new ConcurrentHashMap<>();

    /**
     * get instance of this protocol collection
     * 获取注册的收集实现类
     * @param protocol collect protocol
     * @return implement of Metrics Collection
     */
    public static AbstractCollect invoke(String protocol) {
        return COLLECT_STRATEGY.get(protocol);
    }

    @Override
    public void run(String... args) throws Exception {
        // spi load and registry protocol and collect instance
        ServiceLoader<AbstractCollect> loader = ServiceLoader.load(AbstractCollect.class, AbstractCollect.class.getClassLoader());
        for (AbstractCollect collect : loader) {
            COLLECT_STRATEGY.put(collect.supportProtocol(), collect);
        }
    }
}
