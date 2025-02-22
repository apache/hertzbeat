package org.apache.hertzbeat.push.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
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
            // todo path 解析 monitor 等信息
            boolean flag = pushGatewayService.pushMetricsData(request.getInputStream(), "monitorName");
            if (flag) {
                chain.doFilter(request, response);    
            } else {
                PushErrorRequestWrapper errorRequestWrapper = new PushErrorRequestWrapper(httpRequest);
                chain.doFilter(errorRequestWrapper, response);   
            }
        } else {
            chain.doFilter(request, response);
        }
    }

    @Override
    public void destroy() {}
}
