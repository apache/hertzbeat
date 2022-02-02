---
id: path-match  
title: URI路径匹配        
sidebar_label: URI路径匹配    
---

我们配置的资源格式为：`requestUri===httpMethod`, 即请求的路径加上其请求方式(`post,get,put,delete...或者*,*匹配所有请求方式`)作为一个整体被视作一个资源   
`eg: /api/v2/book===get` `get`方式请求`/api/v2/book`接口数据  
这里的`requestUri`支持url路径匹配符匹配: `str*str`, `*`, `**`

| 通配符                      | 描述 |
| ---                        | --- |
| `str*str`                  | 字符串中的*匹配0个或者多个任意字符 |
| `*`                        | 匹配0个或1个目录                |
| `**`                       | 匹配0个或多个目录               |


| 样例                    | 说明  |
| ---                    | ---  |
| `*.html`               | 可以匹配 `content.html`, `user-ui.html` 等 |
| `/api/*/book`          | 可以匹配 `/api/user/book` 或 `/api/book` 等 |
| `/**`                  | 可以匹配任何路径                             |
| `/**/foo`              | 可以匹配 `/api/user/book/foo` 等            |

匹配优先级: 原始字符串 > `str*str` > `*` > `**`  
最长路径匹配原则：  
eg: `requestUri` 为`/app/book/foo`，若存在两个路径匹配模式`/app/**`和`/app/book/*`，则会匹配到`/app/book/*`  
