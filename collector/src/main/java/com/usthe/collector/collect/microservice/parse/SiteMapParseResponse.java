package com.usthe.collector.collect.microservice.parse;

import com.usthe.collector.collect.AbstractParseResponse;
import com.usthe.collector.collect.common.http.CommonHttpClient;
import com.usthe.collector.collect.strategy.ParseStrategyFactory;
import com.usthe.collector.dispatch.DispatchConstants;
import com.usthe.collector.util.CollectorConstants;
import com.usthe.common.entity.job.protocol.HttpProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.IpDomainUtil;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.util.EntityUtils;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.net.ssl.SSLException;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.net.ConnectException;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;

/**
 * @author ：myth
 * @date ：Created 2022/7/15 9:28
 * @description：
 */
@Slf4j
public class SiteMapParseResponse implements AbstractParseResponse {
    @Override
    public void parseResponse(String resp, List<String> aliasFields, HttpProtocol http,
                              CollectRep.MetricsData.Builder builder, Long responseTime) {
        List<String> siteUrls = new LinkedList<>();
        // 使用xml解析
        boolean isXmlFormat = true;
        try {
            DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
            DocumentBuilder db = dbf.newDocumentBuilder();
            Document document = db.parse(new ByteArrayInputStream(resp.getBytes(StandardCharsets.UTF_8)));
            NodeList urlList = document.getElementsByTagName("url");
            for (int i = 0; i < urlList.getLength(); i++) {
                Node urlNode = urlList.item(i);
                NodeList childNodes = urlNode.getChildNodes();
                for (int k = 0; k < childNodes.getLength(); k++) {
                    Node currentNode = childNodes.item(k);
                    // 区分出text类型的node以及element类型的node
                    if (currentNode.getNodeType() == Node.ELEMENT_NODE && "loc".equals(currentNode.getNodeName())) {
                        //获取了loc节点的值
                        siteUrls.add(currentNode.getFirstChild().getNodeValue());
                        break;
                    }
                }
            }
        } catch (Exception e) {
            log.warn(e.getMessage());
            isXmlFormat = false;
        }
        // 若xml解析失败 用txt格式解析
        if (!isXmlFormat) {
            try {
                String[] urls = resp.split("\n");
                // 校验是否是URL
                if (IpDomainUtil.isHasSchema(urls[0])) {
                    siteUrls.addAll(Arrays.asList(urls));
                }
            } catch (Exception e) {
                log.warn(e.getMessage(), e);
            }
        }
        // 开始循环访问每个site url 采集其 http status code, resTime, 异常信息
        for (String siteUrl : siteUrls) {
            String errorMsg = "";
            Integer statusCode = null;
            long startTime = System.currentTimeMillis();
            try {
                HttpGet httpGet = new HttpGet(siteUrl);
                CloseableHttpResponse response = CommonHttpClient.getHttpClient().execute(httpGet);
                statusCode = response.getStatusLine().getStatusCode();
                EntityUtils.consume(response.getEntity());
            } catch (ClientProtocolException e1) {
                if (e1.getCause() != null) {
                    errorMsg = e1.getCause().getMessage();
                } else {
                    errorMsg = e1.getMessage();
                }
            } catch (UnknownHostException e2) {
                // 对端不可达
                errorMsg = "unknown host";
            } catch (InterruptedIOException | ConnectException | SSLException e3) {
                // 对端连接失败
                errorMsg = "connect error: " + e3.getMessage();
            } catch (IOException e4) {
                // 其它IO异常
                errorMsg = "io error: " + e4.getMessage();
            } catch (Exception e) {
                errorMsg = "error: " + e.getMessage();
            }
            long resTime = System.currentTimeMillis() - startTime;
            CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
            for (String alias : aliasFields) {
                if (CollectorConstants.URL.equalsIgnoreCase(alias)) {
                    valueRowBuilder.addColumns(siteUrl);
                } else if (CollectorConstants.STATUS_CODE.equalsIgnoreCase(alias)) {
                    valueRowBuilder.addColumns(statusCode == null ?
                            CommonConstants.NULL_VALUE : String.valueOf(statusCode));
                } else if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                    valueRowBuilder.addColumns(String.valueOf(resTime));
                } else if (CollectorConstants.ERROR_MSG.equalsIgnoreCase(alias)) {
                    valueRowBuilder.addColumns(errorMsg);
                } else {
                    valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                }
            }
            builder.addValues(valueRowBuilder.build());
        }
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        ParseStrategyFactory.register(DispatchConstants.PARSE_SITE_MAP, this);
    }
}
