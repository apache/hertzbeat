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

- `FORMATTER` : 决定表达式计算的结果的格式
- `DURATION` : 时间段大小，正整数
- `TIME_UNIT` : 时间段单位

### 支持的格式化类型

| 名称   | 描述                       | 
|------|--------------------------|
| @now | 格式化为 `yyyy-MM-dd HH:mm:ss` |



