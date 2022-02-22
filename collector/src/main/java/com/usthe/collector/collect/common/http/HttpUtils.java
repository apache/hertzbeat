package com.usthe.collector.collect.common.http;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategy;
import com.google.common.base.Charsets;
import com.google.common.base.Strings;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.IOUtils;
import org.apache.http.*;
import org.apache.http.client.HttpClient;
import org.apache.http.client.ResponseHandler;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.*;
import org.apache.http.client.utils.URIBuilder;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.impl.conn.PoolingHttpClientConnectionManager;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.protocol.HTTP;
import org.apache.http.util.EntityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Http各种请求方法的实现
 *
 * @author 花城
 * @version 1.0
 * @date 2022/2/21 7:16 下午
 * @Description
 */
@Slf4j
public class HttpUtils {
    private static final Logger LOGGER = LoggerFactory.getLogger(HttpUtils.class);

    private CloseableHttpClient httpClient;
    //连接超时时间为30s
    private int connectionTimeout = 30000;
    //读取超时时间为300s
    private int socketTimeout = 300000;
    private int MAX_TOTAL = 3000;
    //单路由的最大并发连接数
    private int MAX_PER_ROUTE = 1000;
    //设置从链接池中获取连接时间为无限大
    private int CONNECTION_REQUEST_TIMEOUT = 0;

    private static ObjectMapper objectMapper;

    static  {
        objectMapper = new ObjectMapper();
        // asr返回格式为命名用下划线格式，java为驼峰式，json需要转换
//        objectMapper.setPropertyNamingStrategy(PropertyNamingStrategy.CAMEL_CASE_TO_LOWER_CASE_WITH_UNDERSCORES);
        objectMapper.setPropertyNamingStrategy(PropertyNamingStrategy.SNAKE_CASE);

        objectMapper.configure(DeserializationFeature.FAIL_ON_IGNORED_PROPERTIES, false);
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        objectMapper.configure(DeserializationFeature.FAIL_ON_INVALID_SUBTYPE, false);
        objectMapper.configure(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES, false);
        objectMapper.configure(DeserializationFeature.FAIL_ON_NUMBERS_FOR_ENUMS, false);
        objectMapper.configure(JsonParser.Feature.ALLOW_UNQUOTED_FIELD_NAMES, true);
        objectMapper.configure(JsonParser.Feature.ALLOW_SINGLE_QUOTES, true);

    }

    public void init() {
        RequestConfig config = RequestConfig.custom().setConnectTimeout(connectionTimeout).
                setConnectionRequestTimeout(CONNECTION_REQUEST_TIMEOUT).setSocketTimeout(socketTimeout).build();
        PoolingHttpClientConnectionManager pccm = new PoolingHttpClientConnectionManager();
        pccm.setMaxTotal(MAX_TOTAL);
        pccm.setDefaultMaxPerRoute(MAX_PER_ROUTE);
        httpClient = HttpClients.custom().setConnectionManager(pccm).setDefaultRequestConfig(config).build();
    }

    public HttpResult doGet(String url, Map<String, String> params) {
        try {
            URIBuilder uriBuilder = new URIBuilder(url);
            for (Map.Entry<String, String> entry : params.entrySet()) {
                uriBuilder.addParameter(entry.getKey(), entry.getValue());
            }
            HttpGet httpget = new HttpGet(uriBuilder.build());
            httpget.addHeader("contentEncoding", "UTF-8");
            return doExecuteHttpRqeuestBase(httpget);
        } catch (Exception e) {
            LOGGER.error("Error when doGet : " + url, e);
            return failHttp(e.getMessage());
        }
    }

    public HttpResult doGetWithHeaders(String url, Map<String, String> params, Map<String, String> headers) {
        try {
            URIBuilder uriBuilder = new URIBuilder(url);
            params.forEach(uriBuilder::addParameter);
            HttpGet httpget = new HttpGet(uriBuilder.build());
            httpget.addHeader("contentEncoding", "UTF-8");
            headers.forEach(httpget::addHeader);
            return doExecuteHttpRqeuestBase(httpget);
        } catch (Exception e) {
            LOGGER.error("Error when doGet : " + url, e);
            return failHttp(e.getMessage());
        }
    }

    public HttpResult doPutWithHeaders(String url, Map<String, String> params, Map<String, String> headers) {
        try {
            URIBuilder uriBuilder = new URIBuilder(url);
            params.forEach(uriBuilder::addParameter);
            HttpPut httpget = new HttpPut(uriBuilder.build());
            httpget.addHeader("contentEncoding", "UTF-8");
            headers.forEach(httpget::addHeader);
            return doExecuteHttpRqeuestBase(httpget);
        } catch (Exception e) {
            LOGGER.error("Error when doPut : " + url, e);
            return failHttp(e.getMessage());
        }
    }

    public HttpResult doPost(String url, Map<String, String> formParams) {
        // 创建httppost
        HttpPost httpPost = new HttpPost(url);
        // 设置参数
        RequestConfig.Builder customReqConf = RequestConfig.custom();
        customReqConf.setConnectTimeout(connectionTimeout);
        customReqConf.setSocketTimeout(socketTimeout);
        httpPost.setConfig(customReqConf.build());

        List<NameValuePair> formparams = new ArrayList<NameValuePair>();
        for (Map.Entry<String, String> entry : formParams.entrySet()) {
            formparams.add(new BasicNameValuePair(entry.getKey(), entry.getValue()));
        }
        UrlEncodedFormEntity entity = null;
        try {
            entity = new UrlEncodedFormEntity(formparams, "UTF-8");
            entity.setChunked(true);
        } catch (UnsupportedEncodingException e) {
            LOGGER.error("UrlEncode error : " + url, e);
        }
        httpPost.setEntity(entity);
        return doExecuteHttpRqeuestBase(httpPost);
    }

    public HttpResult doPostWithHeader(String url, String bodyJsonString, Map<String, String> headers) {
        // 创建httppost
        HttpPost httpPost = new HttpPost(url);

        // 设置参数
        RequestConfig.Builder customReqConf = RequestConfig.custom();
        customReqConf.setConnectTimeout(connectionTimeout);
        customReqConf.setSocketTimeout(socketTimeout);
        httpPost.setConfig(customReqConf.build());
        headers.forEach(httpPost::addHeader);
        StringEntity entity = new StringEntity(bodyJsonString, "UTF-8");//解决中文乱码问题
        entity.setContentEncoding("UTF-8");
        entity.setContentType(ContentType.APPLICATION_JSON.toString());
        httpPost.setEntity(entity);
        return doExecuteHttpRqeuestBase(httpPost);
    }

    public HttpResponse doPostWithOriginalResponse(String url, List<NameValuePair> nvpList, String charset) {
        HttpResponse response = null;
        try{
            HttpPost httpPost = new HttpPost(url);
            httpPost.setHeader(HttpHeaders.CONNECTION, "close");
            httpPost.setEntity(new UrlEncodedFormEntity(nvpList,charset));
            response = httpClient.execute(httpPost);
        }catch (Exception e){
            LOGGER.error("doPostWithOriginalResponse error : ", e);
        }
        return response;
    }

    public HttpResult doPost(String url, String bodyJsonString) {
        // 创建httppost
        HttpPost httpPost = new HttpPost(url);

        // 设置参数
        RequestConfig.Builder customReqConf = RequestConfig.custom();
        customReqConf.setConnectTimeout(connectionTimeout);
        customReqConf.setSocketTimeout(socketTimeout);
        httpPost.setConfig(customReqConf.build());

        StringEntity entity = new StringEntity(bodyJsonString, "UTF-8");//解决中文乱码问题
        entity.setContentEncoding("UTF-8");
        entity.setContentType(ContentType.APPLICATION_JSON.toString());
        httpPost.setEntity(entity);
        return doExecuteHttpRqeuestBase(httpPost);
    }

    public HttpResult doPostWithEntity(String url, HttpEntity entity) {
        // 创建httppost
        HttpPost httpPost = new HttpPost(url);

        // 设置参数
        RequestConfig.Builder customReqConf = RequestConfig.custom();
        customReqConf.setConnectTimeout(connectionTimeout);
        customReqConf.setSocketTimeout(socketTimeout);
        httpPost.setConfig(customReqConf.build());

        httpPost.setEntity(entity);
        return doExecuteHttpRqeuestBase(httpPost);
    }

    public HttpResult doDeleteWithHeaders(String url, Map<String, String> params, Map<String,String> headers) {
        try {
            URIBuilder uriBuilder = new URIBuilder(url);
            params.forEach(uriBuilder::addParameter);
            HttpDelete httpDelete = new HttpDelete(uriBuilder.build());
            httpDelete.addHeader("contentEncoding", "UTF-8");
            headers.forEach(httpDelete::addHeader);
            return doExecuteHttpRqeuestBase(httpDelete);

        } catch (Exception e) {
            LOGGER.error("Error when doDelete : " + url, e);
            return failHttp(e.getMessage());
        }
    }

    private HttpResult doExecuteHttpRqeuestBase(HttpRequestBase httpRequestBase) {
        try {
            HttpResultResponseHandler sph = new HttpResultResponseHandler();
            return httpClient.execute(httpRequestBase, sph);
        } catch (Exception e) {
            LOGGER.error("Error when " + httpRequestBase.getMethod() + " : " + httpRequestBase.getURI(), e);
            return failHttp(e.getMessage());
        } finally {
            if (httpRequestBase != null) {
                httpRequestBase.abort();
            }
        }
    }

    /**
     * 请求体为json格式对象
     *
     * @param path
     * @param form
     * @return
     */
    public static HttpPost newJsonBodyPostRequest(String path, Map<String, Object> form) {
        HttpPost post = new HttpPost(path);
        String json = toJsonString(form);
        HttpEntity entity = new StringEntity(json, ContentType.APPLICATION_JSON);
        post.setEntity(entity);
        post.addHeader(HttpHeaders.ACCEPT, CONTENT_TYPE);
        post.addHeader(HttpHeaders.CONTENT_TYPE, CONTENT_TYPE);
        return post;
    }
    static final String CONTENT_TYPE = "application/json";


    public static String toJsonString(Object val) {
        try {
            byte[] bytes = objectMapper.writeValueAsBytes(val);
            return new String(bytes, Charsets.UTF_8);
        } catch (IOException e) {
            throw new RuntimeException("toJsonString error", e);
        }
    }

    public static <T> T parseHttpResponseObject(String json, TypeReference<T> type) throws IOException {
        if (Strings.isNullOrEmpty(json)) {
            return null;
        }
        return objectMapper.readValue(json, type);
    }

    public static String toRequestString(HttpRequestBase r) {
        if (r == null) {
            return "null";
        }
        return r.getMethod() + " " + r.getURI();
    }

    private class HttpResultResponseHandler implements ResponseHandler<HttpResult> {
        @Override
        public HttpResult handleResponse(HttpResponse response) throws IOException {
            HttpResult result = new HttpResult();
            HttpEntity entity = response.getEntity();
            Header[] headers = response.getAllHeaders();
            if (isNotEmpty(headers)) {
                HashMap<String, String> headerMap = new HashMap<String, String>();
                for (Header h : headers) {
                    headerMap.put(h.getName(), h.getValue());
                }
                result.setHeader(headerMap);
            }

            InputStream i = entity.getContent();
            String res = IOUtils.toString(new InputStreamReader(i, "UTF-8"));
            result.setCode(response.getStatusLine().getStatusCode());
            result.setBody(res);

            i.close();

            return result;
        }
    }

    private boolean isNotEmpty(Object[] array) {
        return array != null && array.length > 0;
    }

    private HttpResult failHttp(String message) {
        HttpResult result = new HttpResult();
        result.setCode(500);
        result.setBody(message);
        return result;
    }

    public static class HttpResult {
        private String body;
        private Map<String, String> header;
        private int code;

        public String getBody() {
            return body;
        }

        void setBody(String body) {
            this.body = body;
        }

        public Map<String, String> getHeader() {
            return header;
        }

        void setHeader(Map<String, String> header) {
            this.header = header;
        }

        public int getCode() {
            return code;
        }

        void setCode(int code) {
            this.code = code;
        }

        public boolean is200() {
            return this.code == 200;
        }

        public boolean isNot200() {
            return !this.is200();
        }

        public HttpResult checkHttpCode() {
            if (isNot200()) {
                throw new RuntimeException("执行http方法出错，返回值非200，body=" + body);
            }
            return this;
        }

    }

    public void setConnectionTimeout(int connectionTimeout) {
        this.connectionTimeout = connectionTimeout;
    }

    public void setSocketTimeout(int socketTimeout) {
        this.socketTimeout = socketTimeout;
    }

    public void setMAX_PER_ROUTE(int MAX_PER_ROUTE) {
        this.MAX_PER_ROUTE = MAX_PER_ROUTE;
    }

    public void setMAX_TOTAL(int MAX_TOTAL) {
        this.MAX_TOTAL = MAX_TOTAL;
    }

    public void setCONNECTION_REQUEST_TIMEOUT(int CONNECTION_REQUEST_TIMEOUT) {
        this.CONNECTION_REQUEST_TIMEOUT = CONNECTION_REQUEST_TIMEOUT;
    }
    /**
     * 发送post请求
     *
     * @param url  请求的url
     * @param body json串
     * @return
     */
    public static String sendPostJsonBody(String url, String body) {
        log.debug("[HttpClientUtil][sendPostJsonBody] 入参 url={} body={}", url, body);
        HttpPost httpPost = new HttpPost(url);
        httpPost.addHeader(HTTP.CONTENT_TYPE, "application/json;charset=utf-8");
        StringEntity entity = new StringEntity(body, "utf-8");
        entity.setContentEncoding("UTF-8");
        entity.setContentType("application/json");
        httpPost.setEntity(entity);
        HttpClientBuilder httpClientBuilder = HttpClientBuilder.create();
        try {
            HttpClient client = httpClientBuilder.build();
            HttpResponse response = client.execute(httpPost);
            if (response.getStatusLine() != null && response.getStatusLine().getStatusCode() == HttpStatus.SC_OK) {
                String result = EntityUtils.toString(response.getEntity(), "utf-8");
                log.debug("[HttpClientUtil][sendPostJsonBody] 结果 url={} result={}", url, result);
                return result;
            }
            log.warn("[HttpClientUtil][sendPostJsonBody] 请求失败 response={}", url, response.toString());
            return "";
        } catch (IOException ex) {
            log.error("[HttpClientUtil][sendPostJsonBody] 请求异常 ex={}", url, ex);
            return "";
        }
    }

    /**
     * 发送post请求
     *
     * @param url  请求的url
     * @param body json串
     * @return
     */
    public static String sendPostJsonBodyNoEncoding(String url, String body) {
        log.debug("[HttpClientUtil][sendPostJsonBody] 入参 url={} body={}", url, body);
        HttpPost httpPost = new HttpPost(url);
        httpPost.addHeader(HTTP.CONTENT_TYPE, "application/json;charset=utf-8");
        StringEntity entity = new StringEntity(body, "utf-8");
        entity.setContentType("application/json");
        httpPost.setEntity(entity);
        HttpClientBuilder httpClientBuilder = HttpClientBuilder.create();
        try {
            HttpClient client = httpClientBuilder.build();
            HttpResponse response = client.execute(httpPost);
            if (response.getStatusLine() != null && response.getStatusLine().getStatusCode() == HttpStatus.SC_OK) {
                String result = EntityUtils.toString(response.getEntity(), "utf-8");
                log.debug("[HttpClientUtil][sendPostJsonBody] 结果 url={} result={}", url, result);
                return result;
            }
            log.warn("[HttpClientUtil][sendPostJsonBody] 请求失败 response={}", url, response.toString());
            return "";
        } catch (IOException ex) {
            log.error("[HttpClientUtil][sendPostJsonBody] 请求异常 ex={}", url, ex);
            return "";
        }
    }

    public static String sendGet(String url) {
        log.debug("[HttpClientUtil][sendPostJsonBody] 入参 url={} ", url);
        HttpGet httpPost = new HttpGet(url);
        HttpClientBuilder httpClientBuilder = HttpClientBuilder.create();
        try {
            HttpClient client = httpClientBuilder.build();
            HttpResponse response = client.execute(httpPost);
            if (response.getStatusLine() != null && response.getStatusLine().getStatusCode() == HttpStatus.SC_OK) {
                String result = EntityUtils.toString(response.getEntity(), "utf-8");
                log.debug("[HttpClientUtil][sendPostJsonBody] 结果 url={} result={}", url, result);
                return result;
            }
            log.warn("[HttpClientUtil][sendPostJsonBody] 请求失败 response={}", url, response.toString());
            return "";
        } catch (IOException ex) {
            log.error("[HttpClientUtil][sendPostJsonBody] 请求异常 ex={}", url, ex);
            return "";
        }
    }

}
