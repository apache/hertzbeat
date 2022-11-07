package com.usthe.collector.collect.http.micro;

import com.usthe.collector.util.JsonPathParser;
import com.usthe.common.entity.job.protocol.HttpProtocol;
import com.usthe.common.util.CommonConstants;
import com.jayway.jsonpath.TypeRef;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
/**
 *
 *
 * @description： 微服务默认解析
 *
 */
@Slf4j
@NoArgsConstructor
public class MicroLastParser extends AbstractMicroParse {
    @Override
    public Boolean checkType(HttpProtocol http) {
        return true;
    }

    @Override
    public void parse(String resp,List<String> fields, List<String> aliasFields ,List<String> jsonScript, HttpProtocol http,
                      Map<String,List<String>> tempcloums,String kv) {
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
                for (Map<String, Object> result : results) {
                    if(kv!=null&&kv.contains(aliasFields.get(i))){
                        if(tempcloums.containsKey(fields.get(i))){
                            List<String> list = tempcloums.get(fields.get(i));
                            list.add(String.valueOf(kv.split(":")[1]));
                        }else {
                            ArrayList<String> objects = new ArrayList<>();
                            objects.add(String.valueOf(result.get(aliasFields.get(i))));
                            tempcloums.put(fields.get(i),objects);
                        }
                    }else if(result.containsKey(aliasFields.get(i))){
                        if(tempcloums.containsKey(fields.get(i))){
                            List<String> list = tempcloums.get(fields.get(i));
                            list.add(String.valueOf(result.get(aliasFields.get(i))));
                        }else {
                            ArrayList<String> objects = new ArrayList<>();
                            objects.add(String.valueOf(result.get(aliasFields.get(i))));
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
    }

    @Override
    void parse(String resp,String field, String aliasField, String jsonScript, HttpProtocol http, Map<String, List<String>> tempcloums,String kv) {

    }
}
