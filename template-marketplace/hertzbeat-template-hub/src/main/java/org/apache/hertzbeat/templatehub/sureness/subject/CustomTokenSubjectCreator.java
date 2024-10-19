package org.apache.hertzbeat.templatehub.sureness.subject;

import com.usthe.sureness.subject.Subject;
import com.usthe.sureness.subject.SubjectCreate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.servlet.http.HttpServletRequest;

/**
 * custom token creator, get token from http request header - {"Token" : "tokenValue"}
 * tokenValue is : admin--issueTime--refreshPeriodTime--uuid
 * @author tomsun28
 * @date 2020-12-03 22:08
 */
//SubjectCreat根据request请求体创造Subject，不同的认证鉴权处理器Processor处理其所支持的Subject
public class CustomTokenSubjectCreator implements SubjectCreate {

    private static final Logger logger = LoggerFactory.getLogger(CustomTokenSubjectCreator.class);

    private static final String HEADER_TOKEN = "Token";
    private static final String TOKEN_SPLIT = "--";
    private static final int TOKEN_SPLIT_SIZE = 4;

    @Override
    public boolean canSupportSubject(Object context) {
        // support token
        // {"Token" : "tokenValue"}
        if (context instanceof HttpServletRequest) {
            String authorization = ((HttpServletRequest)context).getHeader(HEADER_TOKEN);
            return authorization != null && authorization.split(TOKEN_SPLIT).length == TOKEN_SPLIT_SIZE;
        }
        return false;
    }

    @Override
    public Subject createSubject(Object context) {
        String authorization = ((HttpServletRequest)context).getHeader(HEADER_TOKEN);
        String remoteHost = ((HttpServletRequest) context).getRemoteHost();
        String requestUri = ((HttpServletRequest) context).getRequestURI();
        String requestType = ((HttpServletRequest) context).getMethod();
        String targetUri = requestUri.concat("===").concat(requestType.toLowerCase());
        return CustomTokenSubject.builder(authorization)
                .setRemoteHost(remoteHost)
                .setTargetResource(targetUri)
                .build();
    }
}
