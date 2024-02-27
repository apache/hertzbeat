package org.dromara.hertzbeat.manager.config;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.manager.scheduler.ConsistentHash;
import org.dromara.hertzbeat.manager.scheduler.SchedulerProperties;
import org.springframework.boot.autoconfigure.AutoConfigureAfter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * scheduler config
 * @author tom
 */
@Configuration
@AutoConfigureAfter(value = {SchedulerProperties.class})
@Slf4j
public class SchedulerConfig {
    
    @Bean
    public ConsistentHash consistentHasInstance() {
        return new ConsistentHash();
    }

}
