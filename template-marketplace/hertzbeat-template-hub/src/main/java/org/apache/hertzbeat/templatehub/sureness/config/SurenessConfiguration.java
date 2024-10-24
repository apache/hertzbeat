package org.apache.hertzbeat.templatehub.sureness.config;

import com.usthe.sureness.matcher.DefaultPathRoleMatcher;
import com.usthe.sureness.matcher.PathTreeProvider;
import com.usthe.sureness.matcher.TreePathRoleMatcher;
import com.usthe.sureness.mgt.SurenessSecurityManager;
import com.usthe.sureness.processor.DefaultProcessorManager;
import com.usthe.sureness.processor.Processor;
import com.usthe.sureness.processor.ProcessorManager;
import com.usthe.sureness.processor.support.JwtProcessor;
import com.usthe.sureness.processor.support.NoneProcessor;
import com.usthe.sureness.processor.support.PasswordProcessor;
import com.usthe.sureness.provider.SurenessAccountProvider;
import com.usthe.sureness.provider.annotation.AnnotationPathTreeProvider;
import com.usthe.sureness.provider.ducument.DocumentPathTreeProvider;
import com.usthe.sureness.subject.SubjectFactory;
import com.usthe.sureness.subject.SurenessSubjectFactory;
import com.usthe.sureness.subject.creater.BasicSubjectServletCreator;
import com.usthe.sureness.subject.creater.JwtSubjectServletCreator;
import com.usthe.sureness.subject.creater.NoneSubjectServletCreator;
import com.usthe.sureness.util.JsonWebTokenUtil;
import org.apache.hertzbeat.templatehub.sureness.processor.CustomTokenProcessor;
import org.apache.hertzbeat.templatehub.sureness.subject.CustomPasswdSubjectCreator;
import org.apache.hertzbeat.templatehub.sureness.subject.CustomTokenSubjectCreator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedList;
import java.util.List;

/**
 * sureness config
 * @author tomsun28
 * @date 22:40 2020-03-02
 */
@Configuration
public class SurenessConfiguration {

    /**
     * jwt secret key
     */
    private static final String TOM_SECRET_KEY = "?::4s9ssf2sf4sed45pf):" +
            "RnLN7XNn4wARoQXizIv6MHUsIV+EFfiMw/x7R0ntu4aWr/CWuApcFaj" +
            "CyaFv0bwq2Eik0jdrKUtsA6bx3sDJeFV643R+YYzGMRIqcBIp6AKA98" +
            "GM2RIqcBIp6-?::4390fsf4sdl6opf)4ZI:tdQMtcQQ14pkOAQdQ546";

    @Bean
    ProcessorManager processorManager(SurenessAccountProvider accountProvider) {
        // process init
        List<Processor> processorList = new LinkedList<>();
        // use default none processor
        NoneProcessor noneProcessor = new NoneProcessor();
        processorList.add(noneProcessor);
        // use default jwt processor
        JwtProcessor jwtProcessor = new JwtProcessor();
        processorList.add(jwtProcessor);
        // use default basic auth processor
        PasswordProcessor passwordProcessor = new PasswordProcessor();
        passwordProcessor.setAccountProvider(accountProvider);
        processorList.add(passwordProcessor);

        // use custom token processor
        CustomTokenProcessor customTokenProcessor = new CustomTokenProcessor();
        customTokenProcessor.setAccountProvider(accountProvider);
        processorList.add(customTokenProcessor);
        return new DefaultProcessorManager(processorList);
    }

    /**
     * @param databasePathTreeProvider the path tree resource load from database
     */
    @Bean
    TreePathRoleMatcher pathRoleMatcher(PathTreeProvider databasePathTreeProvider) {
        // the path tree resource load from document - sureness.yml
        PathTreeProvider documentPathTreeProvider = new DocumentPathTreeProvider();
        // the path tree resource load form annotation - @RequiresRoles @WithoutAuth
        AnnotationPathTreeProvider annotationPathTreeProvider = new AnnotationPathTreeProvider();
        annotationPathTreeProvider.setScanPackages(Collections.singletonList("org.apache.hertzbeat.templatehub.controller"));
        // pathRoleMatcher init
        DefaultPathRoleMatcher pathRoleMatcher = new DefaultPathRoleMatcher();
        pathRoleMatcher.setPathTreeProviderList(Arrays.asList(
                documentPathTreeProvider,
                annotationPathTreeProvider,
                databasePathTreeProvider));
        pathRoleMatcher.buildTree();
        return pathRoleMatcher;
    }

    @Bean
    SubjectFactory subjectFactory() {
        // SubjectFactory init
        SubjectFactory subjectFactory = new SurenessSubjectFactory();
        subjectFactory.registerSubjectCreator(Arrays.asList(
                // attention! must add noSubjectCreator first
                new NoneSubjectServletCreator(),
                // use default basic auth subject creator
                new BasicSubjectServletCreator(),
                // use default jwt subject creator
                new JwtSubjectServletCreator(),
                // use custom password creator
                new CustomPasswdSubjectCreator(),
                // use custom token creator
                new CustomTokenSubjectCreator()
        ));
        return subjectFactory;
    }

    @Bean
    SurenessSecurityManager securityManager(ProcessorManager processorManager,
                                            TreePathRoleMatcher pathRoleMatcher, SubjectFactory subjectFactory) {
        JsonWebTokenUtil.setDefaultSecretKey(TOM_SECRET_KEY);
        // surenessSecurityManager init
        SurenessSecurityManager securityManager = SurenessSecurityManager.getInstance();
        securityManager.setPathRoleMatcher(pathRoleMatcher);
        securityManager.setSubjectFactory(subjectFactory);
        securityManager.setProcessorManager(processorManager);
        return securityManager;
    }

}
