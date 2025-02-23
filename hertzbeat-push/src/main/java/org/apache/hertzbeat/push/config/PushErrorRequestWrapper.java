package org.apache.hertzbeat.push.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import lombok.Getter;

/**
 * push error request wrapper
 */
@Getter
public class PushErrorRequestWrapper extends HttpServletRequestWrapper {


    private final String job;

    private final String instance;
    
    public PushErrorRequestWrapper(HttpServletRequest request,  String job, String instance) {
        super(request);
        this.job = job;
        this.instance = instance;
    }
}
