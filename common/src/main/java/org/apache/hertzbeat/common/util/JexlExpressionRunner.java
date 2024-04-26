package org.apache.hertzbeat.common.util;

import com.google.common.collect.Maps;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.apache.commons.jexl3.JexlBuilder;
import org.apache.commons.jexl3.JexlContext;
import org.apache.commons.jexl3.JexlEngine;
import org.apache.commons.jexl3.JexlExpression;
import org.apache.commons.jexl3.MapContext;

/**
 * jexl express runner
 */
public class JexlExpressionRunner {

    private static final JexlEngine jexlEngine;
    
    static {
        Map<String, Object> functions = Maps.newLinkedHashMap();
        // set the root namespace function
        functions.put(null, new JexlCommonFunction());
        jexlEngine = new JexlBuilder().charset(StandardCharsets.UTF_8).cache(256)
                .strict(true).silent(false).namespaces(functions).create();
    }
    
    public static Object evaluate(String expression, Map<String, Object> context) {
        JexlContext jexlContext = new MapContext();
        for (Map.Entry<String, Object> entry : context.entrySet()) {
            jexlContext.set(entry.getKey(), entry.getValue());
        }
        return jexlEngine.createExpression(expression).evaluate(jexlContext);
    }

    public static Object evaluate(JexlExpression expression, Map<String, Object> context) {
        JexlContext jexlContext = new MapContext();
        for (Map.Entry<String, Object> entry : context.entrySet()) {
            jexlContext.set(entry.getKey(), entry.getValue());
        }
        return expression.evaluate(jexlContext);
    }
    
    public static Object evaluate(String expression) {
        return jexlEngine.createExpression(expression).evaluate(new MapContext());
    }
    
    public static JexlExpression compile(String expression) {
        return jexlEngine.createExpression(expression);
    }
    
}
