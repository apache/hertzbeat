---
id: alert_threshold_expr  
title: Threshold trigger expression      
sidebar_label: Threshold trigger expression      
---

> When we configure the threshold alarm, we need to configure the threshold trigger expression. The system calculates whether to trigger the alarm according to the expression and the monitoring index value. Here is a detailed introduction to the use of the expression.    

#### Operators supported by expressions   

```
equals(str1,str2) 
==
<
<=
>
>=
!=
( )
+
-
&&
||
```

Rich operators allow us to define expressions freely.   
Note⚠️ For the equality of string, please use `equals(str1,str2)`, while for the equality judgment of number, please use == or != 

#### Supported environment variables    
> Environment variables, i.e. supported variables such as Metric values, are used in the expression. When the threshold value is calculated and judged, the variables will be replaced with actual values for calculation.   

Non fixed environment variables：These variables will change dynamically according to the monitoring Metric object we choose. For example, if we choose **response time Metric of website monitoring**, the environment variables will have `responseTime - This is the response time variable`     
If we want to set **when the response time of website monitoring is greater than 400** to trigger an alarm，the expression is `responseTime>400`

Fixed environment variables(Rarely used)：`instance : Row instance value`   
This variable is mainly used to calculate multiple instances. For example, we collected `usage`(`usage is non fixed environment variables`) of disk C and disk D, but we only want to set the alarm when **the usage of C disk is greater than 80**. Then the expression is `equals(instance,"c")&&usage>80` 

#### Expression setting case   

1. Website monitoring -> Trigger alarm when the response time is greater than or equal to 400ms    
`responseTime>=400`    
2. API monitoring -> Trigger alarm when the response time is greater than 3000ms    
`responseTime>3000`   
3. Entire site monitoring -> Trigger alarm when URL(instance) path is `https://baidu.com/book/3` and the response time is greater than 200ms   
`equals(instance,"https://baidu.com/book/3")&&responseTime>200`     
4. MYSQL monitoring -> status Metric group -> Trigger alarm when hreads_running(number of running threads) Metric is greater than 7   
`threads_running>7`   

Other issues can be fed back through the communication group ISSUE!  
