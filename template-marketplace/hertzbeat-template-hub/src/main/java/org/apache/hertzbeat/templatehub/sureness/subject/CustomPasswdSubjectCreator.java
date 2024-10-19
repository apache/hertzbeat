package org.apache.hertzbeat.templatehub.sureness.subject;

import com.usthe.sureness.subject.Subject;
import com.usthe.sureness.subject.SubjectCreate;
import com.usthe.sureness.subject.support.PasswordSubject;

import javax.servlet.http.HttpServletRequest;

/**
 * custom subject creator
 * A custom creator is demonstrated here
 * In addition to the basic auth method, we may obtain our account password from other places for authentication.
 * eg: username and password in header
 * header {
 *     "username": "userTom",
 *     "password": "123456"
 * }
 * Here we define a creator to create PasswordSubject from this request header like above.
 * @author tomsun28
 * @date 22:59 2020-03-02
 */
public class CustomPasswdSubjectCreator implements SubjectCreate {

    private static final String USERNAME = "username";
    private static final String PASSWORD = "password";

    @Override
    public boolean canSupportSubject(Object context) {
        // define which request can be access
        if (context instanceof HttpServletRequest) {
            String username = ((HttpServletRequest)context).getHeader(USERNAME);
            String password = ((HttpServletRequest)context).getHeader(PASSWORD);
            return username != null && password != null;
        } else {
            return false;
        }
    }

    @Override
    public Subject createSubject(Object context) {
        // create PasswordSubject from request
        String username = ((HttpServletRequest)context).getHeader(USERNAME);
        String password = ((HttpServletRequest)context).getHeader(PASSWORD);

        String remoteHost = ((HttpServletRequest) context).getRemoteHost();
        String requestUri = ((HttpServletRequest) context).getRequestURI();
        String requestType = ((HttpServletRequest) context).getMethod();
        String targetUri = requestUri.concat("===").concat(requestType).toLowerCase();
        return PasswordSubject.builder(username, password)
                .setRemoteHost(remoteHost)
                .setTargetResource(targetUri)
                .build();
    }
}
