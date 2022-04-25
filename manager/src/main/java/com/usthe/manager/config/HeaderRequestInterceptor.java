package com.usthe.manager.config;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRequest;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;

import java.io.IOException;

import static java.net.Proxy.Type.HTTP;

/**
 * Rest Template interceptor adds request header information
 * restTemplate拦截器添加请求头信息
 *
 * @author tom
 */
public class HeaderRequestInterceptor implements ClientHttpRequestInterceptor {

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution)
            throws IOException {
        // Send json by default
        // 默认发送json
        if (request.getHeaders().getContentType() == null) {
            request.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        }
        // Use short links        使用短链接
        request.getHeaders().add(HttpHeaders.CONNECTION, "close");
        return execution.execute(request, body);
    }
}