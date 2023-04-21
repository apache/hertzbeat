package org.dromara.hertzbeat.manager.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
/**
 * @author <a href="mailto:zqr10159@126.com">zqr10159</a>
 * Created by zqr10159 on 2023/4/20
 */
@Configuration
public class YamlMapperConfig {
    @Bean
    public YAMLMapper yamlMapper() {
        YAMLMapper yamlMapper = new YAMLMapper(new YAMLFactory());
        yamlMapper.registerModule(new JavaTimeModule());
        return yamlMapper;
    }

    @Bean
    @Primary
    public ObjectMapper objectMapperr() {
        return new ObjectMapper().registerModule(new JavaTimeModule());
    }
}
