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

package org.apache.hertzbeat.manager.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Collections;
import java.util.EnumMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.template.TemplateAvailabilityProvider;
import org.springframework.boot.autoconfigure.template.TemplateAvailabilityProviders;
import org.springframework.boot.autoconfigure.web.WebProperties;
import org.springframework.boot.autoconfigure.web.servlet.error.ErrorViewResolver;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.util.Assert;
import org.springframework.util.FileCopyUtils;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.View;

/**
 * Solve the front-end routing problem of angular static website resources with DefaultErrorViewResolver and route the 404 website request to the angular front-end
 */
@Configuration
@Slf4j
public class AngularErrorViewResolver implements ErrorViewResolver, Ordered {

    private static final Map<HttpStatus.Series, String> SERIES_VIEWS;
    private static final String NOT_FOUND_CODE = "404";

    static {
        Map<HttpStatus.Series, String> views = new EnumMap<>(HttpStatus.Series.class);
        views.put(HttpStatus.Series.CLIENT_ERROR, "4xx");
        views.put(HttpStatus.Series.SERVER_ERROR, "5xx");
        SERIES_VIEWS = Collections.unmodifiableMap(views);
    }

    private final ApplicationContext applicationContext;

    private final WebProperties.Resources resources;

    private final TemplateAvailabilityProviders templateAvailabilityProviders;

    private int order = Ordered.LOWEST_PRECEDENCE;

    public AngularErrorViewResolver(ApplicationContext applicationContext, WebProperties webProperties) {
        Assert.notNull(applicationContext, "ApplicationContext must not be null");
        Assert.notNull(webProperties.getResources(), "Resources must not be null");
        this.applicationContext = applicationContext;
        this.resources = webProperties.getResources();
        this.templateAvailabilityProviders = new TemplateAvailabilityProviders(applicationContext);
    }

    @Override
    public ModelAndView resolveErrorView(HttpServletRequest request, HttpStatus status, Map<String, Object> model) {
        ModelAndView modelAndView = resolve(String.valueOf(status.value()), model);
        if (modelAndView == null && SERIES_VIEWS.containsKey(status.series())) {
            modelAndView = resolve(SERIES_VIEWS.get(status.series()), model);
        }
        return modelAndView;
    }

    private ModelAndView resolve(String viewName, Map<String, Object> model) {
        String errorViewName = "error/" + viewName;
        if (NOT_FOUND_CODE.equals(viewName)) {
            errorViewName = "index";
        }
        TemplateAvailabilityProvider provider = this.templateAvailabilityProviders.getProvider(errorViewName,
                this.applicationContext);
        if (provider != null) {
            return new ModelAndView(errorViewName, model);
        }
        return resolveResource(errorViewName, model);
    }

    private ModelAndView resolveResource(String viewName, Map<String, Object> model) {
        for (String location : this.resources.getStaticLocations()) {
            try {
                Resource resource = this.applicationContext.getResource(location);
                resource = resource.createRelative(viewName + ".html");
                if (resource.exists()) {
                    return new ModelAndView(new HtmlResourceView(resource), model);
                }
            } catch (Exception ex) {
                log.error("Error resolving resource", ex);
            }
        }
        return null;
    }

    @Override
    public int getOrder() {
        return this.order;
    }

    public void setOrder(int order) {
        this.order = order;
    }

    /**
     * {@link View} backed by an HTML resource.
     */
    private static class HtmlResourceView implements View {

        private final Resource resource;

        HtmlResourceView(Resource resource) {
            this.resource = resource;
        }

        @Override
        public String getContentType() {
            return MediaType.TEXT_HTML_VALUE;
        }

        @Override
        public void render(Map<String, ?> model, @NonNull HttpServletRequest request, HttpServletResponse response)
                throws Exception {
            response.setContentType(getContentType());
            FileCopyUtils.copy(this.resource.getInputStream(), response.getOutputStream());
        }

    }
}
