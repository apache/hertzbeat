---
id: time_expression
title: 时间表达式
sidebar_label: 时间表达式
keywords: [ 动态时间,时间表达式 ]
---


### 简介
HertzBeat支持使用表达式计算监控采集时的相对时间，支持更加灵活的在监控模板中定义时间。

### 语法
```
${FORMATTER [{ + | - }<DURATION> <TIME_UNIT>]}
```


