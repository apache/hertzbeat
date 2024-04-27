---
id: 'document'
title: '文档说明'
sidebar_position: 1
---

<!--
    Licensed to the Apache Software Foundation (ASF) under one or more
    contributor license agreements.  See the NOTICE file distributed with
    this work for additional information regarding copyright ownership.
    The ASF licenses this file to You under the Apache License, Version 2.0
    (the "License"); you may not use this file except in compliance with
    the License.  You may obtain a copy of the License at

       https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
-->

对于任何类型的软件来说，良好的文档都是至关重要的。任何能够改进 HertzBeat 文档的贡献都是受欢迎的。

## 获取文档项目

HertzBeat 项目的文档在 [git 仓库 home 目录](https://github.com/apache/hertzbeat/tree/master/home) 中维护。

首先，您需要将文档项目 fork 到您自己的 github 仓库，然后将文`clone`到您的本地计算机。

```shell
git clone git@github.com:<your-github-user-name>/hertzbeat.git
```

## 预览和生成静态文件

此网站使用 node 进行编译，使用 Docusaurus 框架组件。

1. 下载并安装 nodejs (版本 18.8.0)
2. 将代码克隆到本地 `git clone git@github.com:apache/hertzbeat.git`
3. 在`home`目录下运行 `npm install` 来安装所需的依赖库。
4. 在`home`目录下运行 `npm run start`，您可以访问 http://localhost:3000 查看站点的英文模式预览
5. 在`home`目录下运行 `npm run start-zh-cn`，您可以访问 http://localhost:3000 查看站点的中文模式预览
6. 若要生成静态网站资源文件，请运行 `npm run build`。构建的静态资源位于 build 目录中。

## 目录结构

```html
|-- docs
|-- blog   
|-- i18n
|   `-- zh-CN  // 中文国际化
|       |-- code.json
|       |-- docusaurus-plugin-content-blog
|       |-- docusaurus-plugin-content-docs
|       `-- docusaurus-theme-classic
|-- resource  // 静态资源文件
|-- src
|   |-- theme
|   |-- css
|   |-- js
|   |-- pages
|   |   |-- components
|   |   |-- index.js
|   |-- constants.js
|-- static // 图片静态资源
|   |-- img  //
|   |   |-- blog // 博客图片
|   |   |-- docs // 文档图片
|   |   |-- home // 产品图片
|   |   |-- icons // 图标
|-- docusaurus.config.js
|-- sidebars.js // 文档侧边栏菜单配置
```

## 规范

### 文件的命名规范

全部小写，由破折号分隔。

正例：`render-dom.js / signup.css / index.html / company-logo.png`

反例：`renderDom.js / UserManagement.html`

### 资源路径

图片资源统一放在 `static/img/{模块名称}` 下

css 和其他样式文件放在 `src/css` 目录中。

### 页面内容修改

> 所有页面文档都可以通过底部的'编辑此页面'按钮直接跳转到相应的 github 资源修改页面。

### 页面样式修改

访问页面 https://hertzbeat.apache.org/
位于 `src/pages/components`
