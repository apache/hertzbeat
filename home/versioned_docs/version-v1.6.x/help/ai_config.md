---
id: aiConfig
title: AI QuickStart  
sidebar_label: AI QuickStartr
keywords: [AI]
---

> The dialogue with artificial intelligence is achieved by configuring aiConfig in the application.yml file

### Configuration parameter description

| Name of the parameter |                      Parameter help description                       |
|-----------------------|-----------------------------------------------------------------------|
| type                  | Choose a large AI model (such as Zhipu, Tongyi thousand questions...) |
| model                 | Select the model, which defaults to GLM-4                             |
| api-key               | Gets the api_key, without which you cannot talk to the large model    |

### Large model options and configuration details

#### ZhiPu AI

| Name of the parameter |                       Example                       |                              Link                               |
|-----------------------|-----------------------------------------------------|-----------------------------------------------------------------|
| type                  | zhiPu (must be exactly the same as example)         |                                                                 |
| model                 | glm-4-0520、glm-4 、glm-4-air、glm-4-airx、 glm-4-flash |                                                                 |
| api-key               | xxxxx.xxxxxx                                        | <https://open.bigmodel.cn/login?redirect=%2Fusercenter%2Fapikeys> |

#### Alibaba AI

| Name of the parameter |                                           Example                                            |                                                            Link                                                            |
|-----------------------|----------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------|
| type                  | alibabaAi (must be exactly the same as example)                                              |                                                                                                                            |
| model                 | qwen-turbo、qwen-plus、qwen-max、qwen-max-0428、qwen-max-0403、qwen-max-0107、qwen-max-longcontext | <https://help.aliyun.com/zh/dashscope/developer-reference/model-introduction?spm=a2c4g.11186623.0.0.4e0246c1RQFKMH>          |
| api-key               | xxxxxxxxxxx                                                                                  | <https://help.aliyun.com/zh/dashscope/developer-reference/activate-dashscope-and-create-an-api-key?spm=a2c4g.11186623.0.i10> |

#### Kimi AI

| Name of the parameter |                     Example                     |                     Link                      |
|-----------------------|-------------------------------------------------|-----------------------------------------------|
| type                  | kimiAi (must be exactly the same as example)    |                                               |
| model                 | moonshot-v1-8k、moonshot-v1-32k、moonshot-v1-128k |                                               |
| api-key               | xxxxxxxxxxx                                     | <https://platform.moonshot.cn/console/api-keys> |

#### sparkDesk AI

QuickStart: <https://www.xfyun.cn/doc/platform/quickguide.html>

| Name of the parameter |                     Example                      |                 Link                  |
|-----------------------|--------------------------------------------------|---------------------------------------|
| type                  | sparkDesk (must be exactly the same as example)  |                                       |
| model                 | general、generalv2、generalv3、generalv3.5、4.0Ultra |                                       |
| api-key               | xxxxxxxxxxx                                      | <https://console.xfyun.cn/services/cbm> |
| api-secret            | xxxxxxxxxxx                                      | <https://console.xfyun.cn/services/cbm> |

| sparkDesk version |    model    |
|-------------------|-------------|
| Spark4.0 Ultra    | 4.0Ultra    |
| Spark Max         | generalv3.5 |
| Spark Pro         | generalv3   |
| Spark V2.0        | generalv2   |
| Spark Lite(free)  | general     |
