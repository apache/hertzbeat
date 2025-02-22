package org.apache.hertzbeat.push.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

/**
 *
 */
public class PushErrorRequestWrapper extends HttpServletRequestWrapper {
    
    public PushErrorRequestWrapper(HttpServletRequest request) {
        super(request);
    }
}
