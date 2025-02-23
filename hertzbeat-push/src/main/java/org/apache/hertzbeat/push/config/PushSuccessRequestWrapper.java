package org.apache.hertzbeat.push.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import lombok.Getter;

/**
 * push success request wrapper
 */
@Getter
public class PushSuccessRequestWrapper extends HttpServletRequestWrapper {

    private final String job;
    
    private final String instance;

    public PushSuccessRequestWrapper(HttpServletRequest request, String job, String instance) {
        super(request);
        this.job = job;
        this.instance = instance;
    }
}
