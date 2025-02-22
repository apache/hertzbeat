package org.apache.hertzbeat.push.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import lombok.Data;
import lombok.Getter;

/**
 *
 */
@Getter
public class PushSuccessRequestWrapper extends HttpServletRequestWrapper {

    private final String monitorName;

    public PushSuccessRequestWrapper(HttpServletRequest request, String monitorName) {
        super(request);
        this.monitorName = monitorName;
    }
}
