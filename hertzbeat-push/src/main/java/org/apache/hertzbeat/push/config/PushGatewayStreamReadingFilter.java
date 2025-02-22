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

import org.apache.hertzbeat.push.service.PushGatewayService;


/**
 * todo 
 */
public class PushGatewayStreamReadingFilter implements Filter {
    
    private final PushGatewayService pushGatewayService;
    
    public PushGatewayStreamReadingFilter(PushGatewayService pushGatewayService) {
        this.pushGatewayService = pushGatewayService;
    }
    
    @Override
    public void init(FilterConfig filterConfig) throws ServletException {}

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest httpRequest) {
            String uri = httpRequest.getRequestURI();
            Matcher matcher = PushFilterConfig.uri_pattern.matcher(uri);
            String monitorName = null;
            if (matcher.matches()) {
                // 获取第一个捕获组
                monitorName = matcher.group(1);
                boolean flag = pushGatewayService.pushMetricsData(request.getInputStream(), monitorName);
                if (flag) {
                    PushSuccessRequestWrapper successRequestWrapper = new PushSuccessRequestWrapper(httpRequest, monitorName);
                    chain.doFilter(successRequestWrapper, response);
                } else {
                    PushErrorRequestWrapper errorRequestWrapper = new PushErrorRequestWrapper(httpRequest);
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
