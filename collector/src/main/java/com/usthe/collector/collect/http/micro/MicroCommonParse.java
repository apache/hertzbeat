package com.usthe.collector.collect.http.micro;

import com.usthe.collector.dispatch.DispatchConstants;
import com.usthe.collector.util.JsonPathParser;
import com.usthe.common.entity.job.protocol.HttpProtocol;
import com.usthe.common.util.CommonConstants;
import com.jayway.jsonpath.TypeRef;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 微服务响应通用解析
 * @author myth
 * @date 2022/7/4 15:37
 */

public class MicroCommonParse extends AbstractMicroParse {
    @Override
    Boolean checkType(HttpProtocol http) {
        if(DispatchConstants.PARSE_CHAIN_COMMON.equals(http.getChain())){
            return true;
        }
        return false;
    }

    @Override
    void parse(String resp, List<String> fields,List<String> aliasFields, List<String> jsonScript, HttpProtocol http, Map<String, List<String>> tempcloums,String kv) {
        for (int i = 0; i < aliasFields.size(); i++) {
            TypeRef<List<Map<String,Object>>> typeRef = new TypeRef<List<Map<String,Object>>>() {};
            List<Map<String,Object>> results = JsonPathParser.parseContentWithJsonPath(resp,jsonScript.get(i),typeRef);
            if(results==null||results.isEmpty()){
                if(tempcloums.containsKey(fields.get(i))){
                    continue;
                }else {
                    tempcloums.put(fields.get(i), null);
                }
            }else{
                Map<String,Object> m = new HashMap<>(16);
                results.stream().forEach(map -> {
                    String key = "";
                    Object value = null;
                    if (map.containsKey("statistic")) {
                        key = String.valueOf(map.get("statistic")).toLowerCase();
                        value = String.valueOf(map.get("value"));
                    } else if (map.containsKey("tag")) {
                        key = String.valueOf(map.get("tag")).toLowerCase();
                        value = String.valueOf(map.get("values"));
                    }
                    m.put(key,value);

                });
                if(kv!=null&&kv.contains(aliasFields.get(i))){
                    if(tempcloums.containsKey(fields.get(i))){
                        List<String> list = tempcloums.get(fields.get(i));
                        list.add(String.valueOf(kv.split(":")[1]));
                    }else {
                        ArrayList<String> objects = new ArrayList<>();
                        objects.add(String.valueOf(kv.split(":")[1]));
                        tempcloums.put(fields.get(i),objects);
                    }
                }else if(m.containsKey(aliasFields.get(i))){
                    if(tempcloums.containsKey(fields.get(i))){
                        List<String> list = tempcloums.get(fields.get(i));
                        list.add(String.valueOf(m.get(aliasFields.get(i))));
                    }else {
                        ArrayList<String> objects = new ArrayList<>();
                        objects.add(String.valueOf(m.get(aliasFields.get(i))));
                        tempcloums.put(fields.get(i),objects);
                    }
                }else{
                    if(tempcloums.containsKey(fields.get(i))){
                        List<String> list = tempcloums.get(fields.get(i));
                        list.add(CommonConstants.NULL_VALUE);
                    }else {
                        ArrayList<String> objects = new ArrayList<>();
                        objects.add(CommonConstants.NULL_VALUE);
                        tempcloums.put(fields.get(i),objects);
                    }
                }
            }
        }
    }

    @Override
    void parse(String resp,String field, String aliasField, String jsonScript, HttpProtocol http, Map<String, List<String>> tempcloums,String kv) {

    }
}
