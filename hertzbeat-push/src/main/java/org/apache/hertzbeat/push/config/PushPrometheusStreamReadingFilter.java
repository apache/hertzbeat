package org.apache.hertzbeat.push.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.util.regex.Matcher;

import java.util.regex.Pattern;
import org.apache.hertzbeat.push.service.PushGatewayService;


/**
 * todo 
 */
public class PushPrometheusStreamReadingFilter implements Filter {
    
    private final PushGatewayService pushGatewayService;
    
    private final Pattern pathPattern = Pattern.compile("^/api/push/prometheus/job/([a-zA-Z0-9_]*)(?:/instance/([a-zA-Z0-9_]*))?$");
    
    public PushPrometheusStreamReadingFilter(PushGatewayService pushGatewayService) {
        this.pushGatewayService = pushGatewayService;
    }
    
    @Override
    public void init(FilterConfig filterConfig) throws ServletException {}

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest httpRequest) {
            String uri = httpRequest.getRequestURI();
            Matcher matcher = pathPattern.matcher(uri);
            String job = null;
            String instance = null;
            if (matcher.matches()) {
                job = matcher.group(1);
                instance = matcher.group(2);
                boolean flag = pushGatewayService.pushPrometheusMetrics(request.getInputStream(), job, instance);
                if (flag) {
                    PushSuccessRequestWrapper successRequestWrapper = new PushSuccessRequestWrapper(httpRequest, job, instance);
                    chain.doFilter(successRequestWrapper, response);
                } else {
                    PushErrorRequestWrapper errorRequestWrapper = new PushErrorRequestWrapper(httpRequest, job, instance);
                    chain.doFilter(errorRequestWrapper, response);
                }
            } else {
                chain.doFilter(request, response);
            }

        } else {
            chain.doFilter(request, response);
        }
    }

    @Override
    public void destroy() {}
}
