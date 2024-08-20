---
id: mongodb_atlas
title: 监控：MongoDB Atlas 数据库
sidebar_label: MongoDB Atlas 数据库
keywords: [ 开源监控系统, 开源数据库监控, MongoDB Atlas 数据库监控 ]
---

> 对MongoDB Atlas 数据库的通用性能指标进行采集监控。

### 配置参数

|  参数名称  |                        参数帮助描述                        |
|--------|------------------------------------------------------|
| 目标Host | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。 |
| 任务名称   | 标识此监控的名称，名称需要保证唯一性。                                  |
| 用户名    | MongoDB用户名，可选。                                       |
| 密码     | MongoDB密码，可选。                                        |
| 数据库    | 数据库名称                                                |
| 认证数据库  | 存储用户凭据的数据库名称。                                        |
| 连接超时时间 | 设置连接MongoDB未响应数据时的超时时间，单位ms毫秒，默认6000毫秒。              |
| 集群模式   | MongoDB Atlas集群取值为:mongodb-atlas                     |
| 采集间隔   | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒。                      |
| 绑定标签   | 用于对监控资源进行分类管理。                                       |
| 描述备注   | 更多标识和描述此监控的备注信息，用户可以在这里备注信息。                         |

### 采集指标

#### 指标集合：构建信息

|       指标名称       | 指标单位 |         指标帮助描述          |
|------------------|------|-------------------------|
| version          | 无    | MongoDB版本信息             |
| gitVersion       | 无    | 源代码git版本                |
| sysInfo          | 无    | 系统信息                    |
| allocator        | 无    | MongoDB所使用的内存分配器        |
| javascriptEngine | 无    | MongoDB所使用的JavaScript引擎 |

#### 指标集合：服务器文档

|  指标名称   | 指标单位 |   指标帮助描述    |
|---------|------|-------------|
| delete  | 无    | 已删除数        |
| insert  | 无    | 已插入数        |
| update  | 无    | 更新数         |
| query   | 无    | 查询数         |
| getmore | 无    | 光标中剩余文档的请求数 |
| command | 无    | 执行命令操作的总数   |

#### 指标集合：网络操作

|    指标名称     | 指标单位 |      指标帮助描述       |
|-------------|------|-------------------|
| Bytes In    | 无    | 执行查询时需要扫描并进行排序的次数 |
| Bytes Out   | 无    | 写冲突的次数            |
| Request Num | 无    | 请求数               |

#### 指标集合： 连接信息

|           指标名称            | 指标单位 |  指标帮助描述   |
|---------------------------|------|-----------|
| Current Connections       | 无    | 当前正在进行连接数 |
| Available Connections     | 无    | 可用连接数     |
| Total Created Connections | 无    | 创建的连接总数   |

#### 指标集合：数据库统计

|       指标名称        | 指标单位  |  指标帮助描述  |
|-------------------|-------|----------|
| Database Name     | 无     | 数据库名称    |
| Collections       | 无     | 集合数      |
| Views             | 无     | 视图数      |
| Objects           | 无     | 文档数      |
| Document Avg Size | Bytes | 文档平均大小   |
| Document Size     | Bytes | 文档大小     |
| Storage Size      | Bytes | 使用存储空间大小 |
| Indexes           | 无     | 索引数      |
| Index Size        | Bytes | 索引大小     |
