/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.templatehub.sureness.subject;

import com.usthe.sureness.subject.PrincipalMap;
import com.usthe.sureness.subject.Subject;

import java.util.List;

/**
 * custom define token subject
 * @author tomsun28
 * @date 2020-12-03 22:08
 */
public class CustomTokenSubject implements Subject {

    private static final long serialVersionUID = 1L;

    /** user identifier **/
    private String appId;

    /** token : admin--issueTime--refreshPeriodTime--uuid **/
    private String token;

    /** remote ip **/
    private String remoteHost;

    /** remote device **/
    private String userAgent;

    /** the roles which this user owned **/
    private List<String> ownRoles;

    /** the uri resource which this user want access **/
    private String targetUri;

    /** the Roles which can access this resource above-targetUri **/
    private List<String> supportRoles;

    private CustomTokenSubject(Builder builder) {
        this.appId = builder.appId;
        this.token = builder.token;
        this.remoteHost = builder.remoteHost;
        this.userAgent = builder.userAgent;
        this.ownRoles = builder.ownRoles;
        this.supportRoles = builder.supportRoles;
        this.targetUri = builder.targetUri;
    }

    @Override
    public Object getPrincipal() {
        return this.appId;
    }

    @Override
    public void setPrincipal(Object var1) {
        this.appId = (String) appId;
    }

    @Override
    public PrincipalMap getPrincipalMap() {
        return null;
    }

    @Override
    public void setPrincipalMap(PrincipalMap var1) {

    }

    @Override
    public Object getCredential() {
        return this.token;
    }

    @Override
    public void setCredential(Object var1) {
        this.token = (String) token;
    }

    @Override
    public Object getOwnRoles() {
        return this.ownRoles;
    }

    @SuppressWarnings("unchecked")
    @Override
    public void setOwnRoles(Object var1) {
        this.ownRoles = (List<String>) var1;
    }

    @Override
    public Object getTargetResource() {
        return this.targetUri;
    }

    @Override
    public void setTargetResource(Object var1) {
        this.targetUri = (String) targetUri;
    }

    @Override
    public Object getSupportRoles() {
        return this.supportRoles;
    }

    @SuppressWarnings("unchecked")
    @Override
    public void setSupportRoles(Object var1) {
        this.supportRoles = (List<String>) var1;
    }

    public String getRemoteHost() {
        return remoteHost;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public static Builder builder(String token) {
        return new Builder(token);
    }

    public static Builder builder(Subject subject) {
        return new Builder(subject);
    }

    public static class Builder {

        private String appId;
        private String token;
        private String remoteHost;
        private String userAgent;
        private List<String> ownRoles;
        private String targetUri;
        private List<String> supportRoles;

        public Builder(String token) {
            this.token = token;
        }

        @SuppressWarnings("unchecked")
        public Builder(Subject subject) {
            this.appId = String.valueOf(subject.getPrincipal());
            this.token = String.valueOf(subject.getCredential());
            this.ownRoles = (List<String>) subject.getOwnRoles();
            this.targetUri = String.valueOf(subject.getTargetResource());
            this.supportRoles = (List<String>) subject.getSupportRoles();
        }

        public Builder setPrincipal(String appId) {
            this.appId = appId;
            return this;
        }

        public Builder setCredentials(String token) {
            this.token = token;
            return this;
        }

        public Builder setTargetResource(String targetUri) {
            this.targetUri = targetUri;
            return this;
        }

        public Builder setOwnRoles(List<String> ownRoles) {
            this.ownRoles = ownRoles;
            return this;
        }

        public Builder setSupportRoles(List<String> supportRoles) {
            this.supportRoles = supportRoles;
            return this;
        }

        public Builder setRemoteHost(String remoteHost) {
            this.remoteHost = remoteHost;
            return this;
        }

        public Builder setUserAgent(String userAgent) {
            this.userAgent = userAgent;
            return this;
        }

        public CustomTokenSubject build() {
            return new CustomTokenSubject(this);
        }

    }
}
