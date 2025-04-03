---
id: aiConfig
title: AI 快速入门  
sidebar_label: AI 快速入门
keywords: [人工智能 AI]
---

> 通过配置application.yml文件里面的aiConfig实现与人工智能的对话

### 配置参数说明

|  参数名称   |            参数帮助描述            |
|---------|------------------------------|
| type    | 选择AI大模型（如智普、通义千问...）         |
| model   | 选择模型，默认为GLM-4                |
| api-key | 获取api_key，如果没有该配置，无法与大模型进行对话 |

### 大模型选项与配置详解

#### 智普AI

|  参数名称   |                         示例                          |                               链接                                |
|---------|-----------------------------------------------------|-----------------------------------------------------------------|
| type    | zhiPu（必须和示例完全相同）                                    | 无                                                               |
| model   | glm-4-0520、glm-4 、glm-4-air、glm-4-airx、 glm-4-flash | 无                                                               |
| api-key | xxxxx.xxxxxx                                        | <https://open.bigmodel.cn/login?redirect=%2Fusercenter%2Fapikeys> |

#### 阿里巴巴AI

|  参数名称   |                                              示例                                              |                                                             链接                                                             |
|---------|----------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------|
| type    | alibabaAi（必须和示例完全相同）                                                                         | 无                                                                                                                          |
| model   | qwen-turbo、qwen-plus、qwen-max、qwen-max-0428、qwen-max-0403、qwen-max-0107、qwen-max-longcontext | <https://help.aliyun.com/zh/dashscope/developer-reference/model-introduction?spm=a2c4g.11186623.0.0.4e0246c1RQFKMH>          |
| api-key | xxxxxxxxxxx                                                                                  | <https://help.aliyun.com/zh/dashscope/developer-reference/activate-dashscope-and-create-an-api-key?spm=a2c4g.11186623.0.i10> |

#### 月之暗面AI

|  参数名称   |                       示例                        |                      链接                       |
|---------|-------------------------------------------------|-----------------------------------------------|
| type    | kimiAi（必须和示例完全相同）                               | 无                                             |
| model   | moonshot-v1-8k、moonshot-v1-32k、moonshot-v1-128k | 无                                             |
| api-key | xxxxxxxxxxx                                     | <https://platform.moonshot.cn/console/api-keys> |

#### 科大讯飞AI

快速入门：<https://www.xfyun.cn/doc/platform/quickguide.html>

|    参数名称    |                        示例                        |                  链接                   |
|------------|--------------------------------------------------|---------------------------------------|
| type       | sparkDesk (must be exactly the same as example)  |                                       |
| model      | general、generalv2、generalv3、generalv3.5、4.0Ultra |                                       |
| api-key    | xxxxxxxxxxx                                      | <https://console.xfyun.cn/services/cbm> |
| api-secret | xxxxxxxxxxx                                      | <https://console.xfyun.cn/services/cbm> |

|      模型版本       | 模型类型(application.yml的model参数) |
|-----------------|-------------------------------|
| Spark4.0 Ultra  | 4.0Ultra                      |
| Spark Max       | generalv3.5                   |
| Spark Pro       | generalv3                     |
| Spark V2.0      | generalv2                     |
| Spark Lite(免费版) | general                       |
