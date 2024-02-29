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

package org.dromara.hertzbeat.collector.collect.http;

import org.dromara.hertzbeat.collector.collect.AbstractCollect;
import org.dromara.hertzbeat.collector.dispatch.DispatchConstants;
import org.dromara.hertzbeat.common.constants.CollectorConstants;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.util.CommonUtil;
import org.dromara.hertzbeat.common.util.IpDomainUtil;
import lombok.extern.slf4j.Slf4j;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLException;
import javax.net.ssl.SSLPeerUnverifiedException;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.net.ConnectException;
import java.net.URL;
import java.net.UnknownHostException;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.Date;

import static org.dromara.hertzbeat.common.constants.SignConstants.RIGHT_DASH;


/**
 * ssl Certificate
 * @author tomsun28
 */
@Slf4j
public class SslCertificateCollectImpl extends AbstractCollect {

    private static final String NAME_SUBJECT = "subject";
    private static final String NAME_EXPIRED = "expired";
    private static final String NAME_START_TIME = "start_time";
    private static final String NAME_START_TIMESTAMP = "start_timestamp";
    private static final String NAME_END_TIME = "end_time";
    private static final String NAME_END_TIMESTAMP = "end_timestamp";

    public SslCertificateCollectImpl() {}

    @Override
    public void collect(CollectRep.MetricsData.Builder builder,
                        long monitorId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        try {
            validateParams(metrics);
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
            return;
        }
        HttpProtocol httpProtocol = metrics.getHttp();
        HttpsURLConnection urlConnection = null;
        try {
            String uri = "";
            if (IpDomainUtil.isHasSchema(httpProtocol.getHost())) {
                uri = httpProtocol.getHost() + ":" + httpProtocol.getPort();
            } else {
                uri = "https://" + httpProtocol.getHost() + ":" + httpProtocol.getPort();
            }
            urlConnection = (HttpsURLConnection) new URL(uri).openConnection();
            urlConnection.connect();
            Certificate[] certificates = urlConnection.getServerCertificates();
            if (certificates == null || certificates.length == 0) {
                builder.setCode(CollectRep.Code.FAIL);
                builder.setMsg("Ssl certificate does not exist.");
                return;
            }

            long responseTime  = System.currentTimeMillis() - startTime;
            for (Certificate certificate : urlConnection.getServerCertificates()) {
                X509Certificate x509Certificate = (X509Certificate) certificate;
                Date now = new Date();
                Date deadline = x509Certificate.getNotAfter();
                boolean expired = deadline != null && now.after(deadline);
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String alias : metrics.getAliasFields()) {
                    if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                        valueRowBuilder.addColumns(Long.toString(responseTime));
                    } else if (NAME_SUBJECT.equalsIgnoreCase(alias)) {
                        valueRowBuilder.addColumns(x509Certificate.getSubjectDN().getName());
                    } else if (NAME_EXPIRED.equalsIgnoreCase(alias)) {
                        valueRowBuilder.addColumns(Boolean.toString(expired));
                    } else if (NAME_START_TIME.equalsIgnoreCase(alias)) {
                        valueRowBuilder.addColumns(x509Certificate.getNotBefore().toLocaleString());
                    } else if (NAME_START_TIMESTAMP.equalsIgnoreCase(alias)) {
                        valueRowBuilder.addColumns(String.valueOf(x509Certificate.getNotBefore().getTime()));
                    } else if (NAME_END_TIME.equalsIgnoreCase(alias)) {
                        valueRowBuilder.addColumns(x509Certificate.getNotAfter().toLocaleString());
                    } else if (NAME_END_TIMESTAMP.equalsIgnoreCase(alias)) {
                        valueRowBuilder.addColumns(String.valueOf(x509Certificate.getNotAfter().getTime()));
                    } else {
                        valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                    }
                }
                builder.addValues(valueRowBuilder.build());
            }
        } catch (SSLPeerUnverifiedException e1) {
            String errorMsg = "Ssl certificate does not exist.";
            if (e1.getMessage() != null) {
                errorMsg = e1.getMessage();
                log.error(errorMsg);
            }
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } catch (UnknownHostException e2) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e2);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_REACHABLE);
            builder.setMsg("unknown host:" + errorMsg);
        } catch (InterruptedIOException | ConnectException | SSLException e3) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e3);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(errorMsg);
        } catch (IOException e4) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e4);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.error(errorMsg, e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
        } finally {
            if (urlConnection != null) {
                urlConnection.disconnect();
            }
        }
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_SSL_CERT;
    }

    private void validateParams(Metrics metrics) throws Exception {
        if (metrics == null || metrics.getHttp() == null) {
            throw new Exception("Http/Https collect must has http params");
        }
        HttpProtocol httpProtocol = metrics.getHttp();
        if (httpProtocol.getUrl() == null
                || "".equals(httpProtocol.getUrl())
                || !httpProtocol.getUrl().startsWith(RIGHT_DASH)) {
            httpProtocol.setUrl(httpProtocol.getUrl() == null ? RIGHT_DASH : RIGHT_DASH + httpProtocol.getUrl().trim());
        }
    }
}
