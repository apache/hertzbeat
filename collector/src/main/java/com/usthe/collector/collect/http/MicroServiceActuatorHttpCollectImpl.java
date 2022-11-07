package com.usthe.collector.collect.http;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import com.usthe.collector.collect.AbstractParseResponse;
import com.usthe.collector.collect.common.http.CommonHttpClient;

import com.usthe.collector.collect.strategy.CollectStrategyFactory;
import com.usthe.collector.collect.strategy.ParseStrategyFactory;
import com.usthe.collector.dispatch.DispatchConstants;
import com.usthe.collector.util.JsonPathParser;
import com.usthe.common.entity.job.Configmap;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.HttpProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.AesUtil;
import com.usthe.common.util.CommonConstants;
import com.usthe.common.util.GsonUtil;
import com.jayway.jsonpath.TypeRef;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.http.HttpStatus;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.protocol.HttpContext;
import org.apache.http.util.EntityUtils;

import javax.net.ssl.SSLException;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.net.ConnectException;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;



/**
 * msa http https collect
 * @author tomsun28
 * @date 2021/11/4 15:37
 */
@Slf4j
public class MicroServiceActuatorHttpCollectImpl extends HttpCollectImpl {
    public static final int SIZE = 50;


    private MicroServiceActuatorHttpCollectImpl() {
        super();
    }

    public static MicroServiceActuatorHttpCollectImpl getInstance() {
        return Singleton.INSTANCE;
    }


    @Override
    public void collect(CollectRep.MetricsData.Builder builder,long appId, String app, Metrics metrics) {
        // 校验参数
        try {
            if (metrics == null || metrics.getHttp() == null) {
                throw new Exception("Http/Https collect must has http params");
            }
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
            return;
        }
        List<CollectRep.ValueRow.Builder> row = new ArrayList<>();
        try{
            HttpProtocol tempHttp = metrics.getHttp();
            List<Configmap> param = metrics.getChildParam();
            Configmap configmap = param.stream().filter(c -> DispatchConstants.CHILD_REQUESTS.equals(c.getKey())).findFirst().orElse(null);
            List<Map<String,Object>> requestValue = (List<Map<String,Object>>)configmap.getValue();
            Map<String, Object> parentMetrics = metrics.getParentMetrics();
            List<String> fieldList = metrics.getAliasFields();
            Map<String,List<String>> tempColums = new HashMap<>(16);
            //遍历不同请求的相关指标采集
            for (Map<String, Object> map : requestValue) {
                //当前请求采集那些指标名称
                List<String> fields = (List<String>) map.get("fields");
                //当前请求需采集指标的具体名称
                List<String> aliasFields = (List<String>) map.get("aliasFields");
                String url = String.valueOf(map.get("url"));
                String method = String.valueOf(map.get("method"));
                //选择那个链路解析数据
                String chain = String.valueOf(map.get("chain"));
                List<String> metaData = (List<String>) map.get("metaData");
                HttpProtocol http = GsonUtil.fromJson(GsonUtil.toJson(tempHttp), HttpProtocol.class);
                JsonElement jsonElement = GsonUtil.toJsonTree(http);
                jsonElement = replaceSpecialValue(jsonElement, param);
                http = GsonUtil.fromJson(jsonElement, HttpProtocol.class);
                http.setMethod(method);
                http.setUrl(url);
                http.setChain(chain);
                //根据情况判断类型走不同的采集方式
                if(map.get("params") instanceof List){
                    List<Map<String,String>> params =(List<Map<String,String>>)map.get("params");
                    for (int i = 0; i < fields.size(); i++) {
                        if(params!=null && i<params.size()) {
                            Map<String, String> pMap = params.get(i);
                            String field = pMap.get("field");
                            String value = pMap.get("value");
                            if (StringUtils.isNotEmpty(field)) {
                                Map<String, String> paramMap = new HashMap<String, String>(16);
                                paramMap.put(field, value);
                                http.setParams(paramMap);
                            }
                        }
                        String resp = request(http, builder);
                        String parseType = metrics.getHttp().getParseType();
                        AbstractParseResponse abstractParseResponse = ParseStrategyFactory.invoke(parseType);
                        abstractParseResponse.parseResponse(resp, fields.get(i),aliasFields!=null?aliasFields.get(i):fields.get(i), metaData.get(i), http, tempColums,null);
                    }
                }else{
                    Map<String,String> params =(Map<String,String>)map.get("params");
                    if(params!=null&&!params.isEmpty()){
                        String script = params.get("script");
                        String field = params.get("field");
                        String value = params.get("value");
                        if(StringUtils.isEmpty(script)){
                            if(StringUtils.isNotEmpty(field)){
                                Map<String,String> paramMap = new HashMap<String,String>(16);
                                paramMap.put(field,value);
                                http.setParams(paramMap);
                            }
                            String resp = request(http, builder);
                            String parseType = metrics.getHttp().getParseType();
                            AbstractParseResponse abstractParseResponse = ParseStrategyFactory.invoke(parseType);
                            abstractParseResponse.parseResponse(resp,fields,aliasFields!=null?aliasFields:fields,metaData,http,tempColums,null);
                        }else{
                            String resp = request(http, builder);
                            List<String> results = JsonPathParser.parseContentWithJsonPath(resp, script, new TypeRef<List<String>>() {});
                            if(results!=null&&!results.isEmpty()) {
                                for (String p : results.subList(0,results.size()>SIZE?SIZE:results.size())) {
                                    http.setMethod(method);
                                    http.setUrl(url);
                                    if (StringUtils.isNotEmpty(field)) {
                                        Map<String, String> paramMap = new HashMap<String, String>(16);
                                        paramMap.put(field, String.format(value, p));
                                        http.setParams(paramMap);
                                    }
                                    String var3 = request(http, builder);
                                    String parseType = metrics.getHttp().getParseType();
                                    AbstractParseResponse abstractParseResponse = ParseStrategyFactory.invoke(parseType);
                                    abstractParseResponse.parseResponse(var3, fields,aliasFields!=null?aliasFields:fields, metaData, http, tempColums,String.format(value, p));
                                }
                            }
                        }
                    }else{
                        String resp = request(http, builder);
                        String parseType = metrics.getHttp().getParseType();
                        AbstractParseResponse abstractParseResponse = ParseStrategyFactory.invoke(parseType);
                        abstractParseResponse.parseResponse(resp,fields,aliasFields!=null?aliasFields:fields,metaData,http,tempColums,null);
                    }
                }
            }
            //获取其中行数最大的值
            int bigcloums = 0 ;
            Iterator<Map.Entry<String, List<String>>> iterator = tempColums.entrySet().stream().iterator();
            while (iterator.hasNext()){
                List<String> value = iterator.next().getValue();
                if(value!=null && value.size()>bigcloums){
                    bigcloums=value.size();
                }
            }
            //通过采集到的数据创建来创建列
            for (int i=0;i<bigcloums;i++){
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                row.add(valueRowBuilder);
            }
            //遍历指标字段获取相应的指标数据，如果当前指标数据中未获取到，再从父指标获取
            for (String field: fieldList) {
                List<String> list = tempColums.get(field);
                for (int i=0;i<bigcloums;i++){
                    if(list==null){
                        Object parent = parentMetrics.get(field);
                        if(parent==null) {
                            row.get(i).addColumns(CommonConstants.NULL_VALUE);
                        }else {
                            row.get(i).addColumns(String.valueOf(parent));
                        }
                    }else if(list.size()<(i+1)){
                        row.get(i).addColumns(CommonConstants.NULL_VALUE);
                    }else{
                        row.get(i).addColumns(list.get(i));
                    }
                }
            }
            //将组装好的数据填充到builder中
            for (CollectRep.ValueRow.Builder builder1 : row) {
                builder.addValues(builder1);
            }
    } catch (Exception e) {
        if(e instanceof ClientProtocolException){
            String errorMsg;
            if (e.getCause() != null) {
                errorMsg = e.getCause().getMessage();
            } else {
                errorMsg = e.getMessage();
            }
            log.error(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(errorMsg);
        }else if(e instanceof UnknownHostException){
            log.info(e.getMessage());
            builder.setCode(CollectRep.Code.UN_REACHABLE);
            builder.setMsg("unknown host");
        }else if((e instanceof InterruptedIOException)||(e instanceof ConnectException)||(e instanceof SSLException) ){
            // 对端连接失败
            log.info(e.getMessage());
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(e.getMessage());
        }else if(e instanceof IOException){
            // 其它IO异常
            log.info(e.getMessage());
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
        }else{
            // 其它异常
            log.error(e.getMessage(), e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
        }
        return;
    }
}



    private String request(HttpProtocol http,CollectRep.MetricsData.Builder builder) throws ClientProtocolException,UnknownHostException,InterruptedIOException,ConnectException,SSLException,IOException,Exception{
        HttpContext httpContext = createHttpContext(http);
        HttpUriRequest request = createHttpRequest(http);
        CloseableHttpResponse response = CommonHttpClient.getHttpClient()
                .execute(request, httpContext);
        int statusCode = response.getStatusLine().getStatusCode();
        log.debug("http response status: {}", statusCode);
        if (statusCode < HttpStatus.SC_OK || statusCode >= HttpStatus.SC_BAD_REQUEST) {
            // 1XX 4XX 5XX 状态码 失败
            throw new Exception("StatusCode " + statusCode);
        } else {
            // 2xx 3xx 状态码 成功
            return EntityUtils.toString(response.getEntity(), StandardCharsets.UTF_8);
        }
    }

    private static class Singleton {
        private static final MicroServiceActuatorHttpCollectImpl INSTANCE = new MicroServiceActuatorHttpCollectImpl();
    }


    /**
     * json parameter replacement       json参数替换
     *
     * @param jsonElement json
     * @param config   parameter list   参数list
     * @return json
     */
    private JsonElement replaceSpecialValue(JsonElement jsonElement, List<Configmap> config) {
        Map<String, Configmap> configmap = config.stream()
                .peek(item -> {
                    // 对加密串进行解密
                    if (item.getType() == CommonConstants.PARAM_TYPE_PASSWORD && item.getValue() != null) {
                        String decodeValue = AesUtil.aesDecode(String.valueOf(item.getValue()));
                        if (decodeValue == null) {
                            log.error("Aes Decode value {} error.", item.getValue());
                        }
                        item.setValue(decodeValue);
                    } else if (item.getValue() != null && item.getValue() instanceof String) {
                        item.setValue(((String) item.getValue()).trim());
                    }
                })
                .collect(Collectors.toMap(Configmap::getKey, item -> item));

        if (jsonElement.isJsonObject()) {
            JsonObject jsonObject = jsonElement.getAsJsonObject();
            Iterator<Map.Entry<String, JsonElement>> iterator = jsonObject.entrySet().iterator();
            while (iterator.hasNext()) {
                Map.Entry<String, JsonElement> entry = iterator.next();
                JsonElement element = entry.getValue();
                String key = entry.getKey();
                // Replace the attributes of the KEY-VALUE case such as http headers params
                // 替换KEY-VALUE情况的属性 比如http headers params
                if (key != null && key.startsWith("^o^") && key.endsWith("^o^")) {
                    key = key.replaceAll("\\^o\\^", "");
                    Configmap param = configmap.get(key);
                    if (param != null && param.getType() == (byte) 3) {
                        String jsonValue = (String) param.getValue();
                        Map<String, String> map = GsonUtil.fromJson(jsonValue, Map.class);
                        if (map != null) {
                            map.forEach((name, value) -> {
                                if (name != null && !"".equals(name.trim())) {
                                    jsonObject.addProperty(name, value);
                                }
                            });
                        }
                    }
                    iterator.remove();
                    continue;
                }
                // Replace normal VALUE value
                // 替换正常的VALUE值
                if (element.isJsonPrimitive()) {
                    // Check if there are special characters Replace
                    // 判断是否含有特殊字符 替换
                    String value = element.getAsString();
                    if (value.startsWith("^o^") && value.endsWith("^o^")) {
                        value = value.replaceAll("\\^o\\^", "");
                        Configmap param = configmap.get(value);
                        if (param != null) {
                            value = (String) param.getValue();
                            jsonObject.addProperty(entry.getKey(), value);
                        } else {
                            iterator.remove();
                        }
                    }
                } else {
                    jsonObject.add(entry.getKey(), replaceSpecialValue(entry.getValue(), config));
                }
            }
        } else if (jsonElement.isJsonArray()) {
            JsonArray jsonArray = jsonElement.getAsJsonArray();
            Iterator<JsonElement> iterator = jsonArray.iterator();
            int index = 0;
            while (iterator.hasNext()) {
                JsonElement element = iterator.next();
                if (element.isJsonPrimitive()) {
                    // Check if there are special characters Replace
                    // 判断是否含有特殊字符 替换
                    String value = element.getAsString();
                    if (value.startsWith("^o^") && value.endsWith("^o^")) {
                        value = value.replaceAll("\\^o\\^", "");
                        Configmap param = configmap.get(value);
                        if (param != null) {
                            value = (String) param.getValue();
                            jsonArray.set(index, new JsonPrimitive(value));
                        } else {
                            iterator.remove();
                        }
                    }
                } else {
                    jsonArray.set(index, replaceSpecialValue(element, config));
                }
                index++;
            }
        }
        return jsonElement;
    }
}
