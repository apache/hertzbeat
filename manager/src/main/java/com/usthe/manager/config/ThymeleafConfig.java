package com.usthe.manager.config;

import org.springframework.boot.autoconfigure.thymeleaf.ThymeleafProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.thymeleaf.spring5.templateresolver.SpringResourceTemplateResolver;
import org.thymeleaf.templatemode.TemplateMode;

import java.nio.charset.StandardCharsets;

/**
 * @author <a href="mailto:gcwm99@gmail.com">gcdd1993</a>
 * @version 2.1
 * Created by Musk.Chen on 2023/1/16
 */
@Configuration
public class ThymeleafConfig {

    @Bean
    public SpringResourceTemplateResolver templateResolver() {
        SpringResourceTemplateResolver templateResolver = new SpringResourceTemplateResolver();
        templateResolver.setPrefix(ThymeleafProperties.DEFAULT_PREFIX);
        templateResolver.setSuffix(".txt");
        templateResolver.setTemplateMode(TemplateMode.TEXT);
        templateResolver.setCharacterEncoding(StandardCharsets.UTF_8.name());
        templateResolver.setOrder(2);
        templateResolver.setCheckExistence(true);
        templateResolver.setCacheable(true);

        return templateResolver;
    }

}
