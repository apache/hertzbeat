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
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.template.TemplateAvailabilityProvider;
import org.springframework.boot.autoconfigure.template.TemplateAvailabilityProviders;
import org.springframework.boot.autoconfigure.web.WebProperties;
import org.springframework.boot.webmvc.autoconfigure.error.ErrorViewResolver;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.util.Assert;
import org.springframework.util.FileCopyUtils;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.View;

/**
 * Resolves registered browser routes to the React single-page application without masking API or asset 404s.
 */
@Configuration
@Slf4j
public class SpaErrorViewResolver implements ErrorViewResolver, Ordered {

    private static final Map<HttpStatus.Series, String> SERIES_VIEWS;
    private static final Set<String> SPA_ROUTE_ROOTS = Set.of(
            "/", "/account", "/alert", "/dashboard", "/entity", "/log", "/metrics", "/monitors",
            "/observability", "/passport", "/setting", "/status", "/topology", "/trace");

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

    public SpaErrorViewResolver(ApplicationContext applicationContext, WebProperties webProperties) {
        Assert.notNull(applicationContext, "ApplicationContext must not be null");
        Assert.notNull(webProperties.getResources(), "Resources must not be null");
        this.applicationContext = applicationContext;
        this.resources = webProperties.getResources();
        this.templateAvailabilityProviders = new TemplateAvailabilityProviders(applicationContext);
    }

    @Override
    public ModelAndView resolveErrorView(HttpServletRequest request, HttpStatus status, Map<String, Object> model) {
        if (status == HttpStatus.NOT_FOUND && isSpaNavigation(request)) {
            return resolve("index", model);
        }
        ModelAndView modelAndView = resolve("error/" + status.value(), model);
        if (modelAndView == null && SERIES_VIEWS.containsKey(status.series())) {
            modelAndView = resolve("error/" + SERIES_VIEWS.get(status.series()), model);
        }
        return modelAndView;
    }

    static boolean isSpaNavigation(HttpServletRequest request) {
        if (!HttpMethod.GET.matches(request.getMethod()) && !HttpMethod.HEAD.matches(request.getMethod())) {
            return false;
        }
        String accept = request.getHeader("Accept");
        if (accept == null || !accept.contains(MediaType.TEXT_HTML_VALUE)) {
            return false;
        }
        String path = request.getRequestURI();
        if (path == null || path.startsWith("/api/") || path.startsWith("/assets/") || path.contains(".")) {
            return false;
        }
        return SPA_ROUTE_ROOTS.stream().anyMatch(root -> root.equals(path)
                || (!"/".equals(root) && path.startsWith(root + "/")));
    }

    private ModelAndView resolve(String viewName, Map<String, Object> model) {
        TemplateAvailabilityProvider provider = templateAvailabilityProviders.getProvider(viewName,
                applicationContext);
        if (provider != null) {
            return new ModelAndView(viewName, model);
        }
        for (String location : resources.getStaticLocations()) {
            try {
                Resource resource = applicationContext.getResource(location).createRelative(viewName + ".html");
                if (resource.exists()) {
                    return new ModelAndView(new HtmlResourceView(resource), model);
                }
            } catch (Exception exception) {
                log.error("Error resolving resource", exception);
            }
        }
        return null;
    }

    @Override
    public int getOrder() {
        return order;
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
            FileCopyUtils.copy(resource.getInputStream(), response.getOutputStream());
        }
    }
}
