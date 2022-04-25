package com.usthe.manager.config;

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
import org.springframework.util.Assert;
import org.springframework.util.FileCopyUtils;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.View;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.util.Collections;
import java.util.EnumMap;
import java.util.Map;

/**
 * Solve the front-end routing problem of angular static website resources with DefaultErrorViewResolver and route the 404 website request to the angular front-end
 * 同DefaultErrorViewResolver 解决angular静态网站资源前端路由问题 把404的网站请求给angular前端进行路由
 *
 * @author tom
 * @date 2021/12/24 21:07
 */
@Configuration
public class AngularErrorViewResolver implements ErrorViewResolver, Ordered {

    private static final Map<HttpStatus.Series, String> SERIES_VIEWS;
    private static final String NOT_FOUND_CODE = "404";

    static {
        Map<HttpStatus.Series, String> views = new EnumMap<>(HttpStatus.Series.class);
        views.put(HttpStatus.Series.CLIENT_ERROR, "4xx");
        views.put(HttpStatus.Series.SERVER_ERROR, "5xx");
        SERIES_VIEWS = Collections.unmodifiableMap(views);
    }

    private ApplicationContext applicationContext;

    private final WebProperties.Resources resources;

    private final TemplateAvailabilityProviders templateAvailabilityProviders;

    private int order = Ordered.LOWEST_PRECEDENCE;

    public AngularErrorViewResolver(ApplicationContext applicationContext, WebProperties.Resources resources) {
        Assert.notNull(applicationContext, "ApplicationContext must not be null");
        Assert.notNull(resources, "Resources must not be null");
        this.applicationContext = applicationContext;
        this.resources = resources;
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

        private Resource resource;

        HtmlResourceView(Resource resource) {
            this.resource = resource;
        }

        @Override
        public String getContentType() {
            return MediaType.TEXT_HTML_VALUE;
        }

        @Override
        public void render(Map<String, ?> model, HttpServletRequest request, HttpServletResponse response)
                throws Exception {
            response.setContentType(getContentType());
            FileCopyUtils.copy(this.resource.getInputStream(), response.getOutputStream());
        }

    }
}
