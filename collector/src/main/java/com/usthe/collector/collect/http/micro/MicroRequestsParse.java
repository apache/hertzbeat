package com.usthe.collector.collect.http.micro;

import com.usthe.collector.dispatch.DispatchConstants;
import com.usthe.collector.util.JsonPathParser;
import com.usthe.common.entity.job.protocol.HttpProtocol;
import com.jayway.jsonpath.TypeRef;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
/**
 * @author ：myth
 * @date ：Created 2022/7/15 9:28
 * @description：微服务响应体请求次数解析
 */
public class MicroRequestsParse extends AbstractMicroParse {

    public static final String DEFAULT_SCRIPT = "$";
    @Override
    Boolean checkType(HttpProtocol http) {
        if(DispatchConstants.PARSE_CHAIN_REQUESTS.equals(http.getChain())){
            return true;
        }
        return false;
    }

    @Override
    void parse(String resp, List<String> fields,List<String> aliasFields, List<String> jsonScript, HttpProtocol http, Map<String, List<String>> tempcloums, String kv) {

    }


    @Override
    void parse(String resp,String field, String aliasField ,String jsonScript, HttpProtocol http,
               Map<String,List<String>> tempcloums,String kv) {
        if(DEFAULT_SCRIPT.equals(jsonScript)){
            TypeRef<List<Map<String,Object>>> typeRef = new TypeRef<List<Map<String,Object>>>(){};
            List<Map<String,Object>> result = JsonPathParser.parseContentWithJsonPath(resp, jsonScript,typeRef);
            if(result!=null&&!result.isEmpty()&&result.get(0).containsKey(aliasField)){
                tempcloums.put(field, Arrays.asList(String.valueOf(result.get(0).get(aliasField))));
            }else{
                tempcloums.put(field,null);
            }
        }else{
            TypeRef<List<Double>> typeRef = new TypeRef<List<Double>>(){};
            List<Double> result = JsonPathParser.parseContentWithJsonPath(resp, jsonScript,typeRef);
            if(result!=null&&!result.isEmpty()){
                Double d = result.get(0);
                tempcloums.put(field, Arrays.asList(String.valueOf(d)));
            }else{
                tempcloums.put(field,null);
            }
        }


    }
}
