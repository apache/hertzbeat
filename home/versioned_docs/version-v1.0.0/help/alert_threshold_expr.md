---
id: alert_threshold_expr  
title: 阈值触发表达式      
sidebar_label: 阈值触发表达式      
---

> 在我们配置阈值告警时，需要配置阈值触发表达式，系统根据表达式和监控指标值计算触发是否告警，这里详细介绍下表达式使用。    

#### 表达式支持的操作符   

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

丰富的操作符让我们可以很自由的定义表达式。   
注意⚠️ 字符串的相等请用 `equals(str1,str2)` 数字类型的相等判断请用== 或 != 

#### 支持的环境变量    
> 环境变量即指标值等支持的变量，用于在表达式中，阈值计算判断时会将变量替换成实际值进行计算    

非固定环境变量：这些变量会根据我们选择的监控指标对象而动态变化，例如我们选择了**网站监控的响应时间指标**，则环境变量就有 `responseTime - 此为响应时间变量`     
如果我们想设置**网站监控的响应时间大于400时**触发告警，则表达式为 `responseTime>400`

固定环境变量(不常用)：`instance : 所属行实例值`   
此变量主要用于计算多实例时，比如采集到c盘d盘的`usage`(`usage为非固定环境变量`),我们只想设置**c盘的usage大于80**时告警，则表达式为 `equals(instance,"c")&&usage>80`   

#### 表达式设置案例   

1. 网站监控->响应时间大于等于400ms时触发告警   
`responseTime>=400`    
2. API监控->响应时间大于3000ms时触发告警   
`responseTime>3000`   
3. 全站监控->URL(instance)路径为 `https://baidu.com/book/3` 的响应时间大于200ms时触发告警  
`equals(instance,"https://baidu.com/book/3")&&responseTime>200`     
4. MYSQL监控->status指标->threads_running(运行线程数)指标大于7时触发告警   
`threads_running>7`   

若遇到问题可以通过交流群ISSUE交流反馈哦！  
