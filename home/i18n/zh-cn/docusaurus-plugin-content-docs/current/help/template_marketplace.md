---
id: template_marketplace
title: 模板市场
sidebar_label: 模板市场
---

> HertzBeat 官方模板市场：用户可自由上传、下载、查看、搜索和分享监控模板文件。

## 基础功能

### 搜索

💡 访客可用

> 展示模板名称、简介、收藏数、下载数、浏览数等信息

1. **无筛选：按上传顺序展示**

   ![search.png](/img/template-marketplace/search.png)

2. **按类别筛选：当前分为六个类别**

   > **📋待办：** 开发标签功能，在类别内进一步细分，如数据库监控模板可分为 MySQL、Oracle 等。

   ![search-category.png](/img/template-marketplace/search-category.png)

3. **按标题模糊搜索**

   ![search-name.png](/img/template-marketplace/search-name.png)

4. **悬浮窗功能：下载最新版本、查看详情、收藏/取消收藏**

   > 登录后显示用户是否已收藏

   ![img.png](/img/template-marketplace/hover-window-guest.png)![img_1.png](/img/template-marketplace/hover-window-user.png)

5. **排序：八种排序方式**

   > **📋待办：** 等待实际安装

### 模板详情

💡 访客可用

   > 展示模板的基本信息，如名称、作者、更新时间、版本信息等。

1. **信息：概要信息、详细信息及其他信息**

   > **📋待办：** 升级为 Markdown 格式

   ![img.png](/img/template-marketplace/detail-info.png)

2. **版本：历史版本下载、分享及基本信息展示**

   > **📋待办：** 设置各历史版本的查看功能，展示版本描述等信息。

   ![img.png](/img/template-marketplace/detail-version.png)

3. **常见问题**

   > **📋待办：** 讨论或 issue 问答区

   ![img.png](/img/template-marketplace/detail-faq.png)

4. **下载**

   > 可直接从列表悬浮窗下载最新版本。
   > 也可直接从模板详情页下载最新版本。
   > 可从版本页下载历史版本。

   ![img.png](/img/template-marketplace/download.png)

5. **分享**

   > 模板详情页可分享最新版本。
   > 版本页可分享历史版本。
   > 分享会自动将分享 URL 复制到剪贴板，被分享者可通过该 URL 下载文件。
   >
   > **📋待办：** 通过分享模板的 URL 访问共享模板详情页，被分享者可自由选择是否下载。

   ![img.png](/img/template-marketplace/share.png)

### 用户中心

💡 用户可用

   > 提供资产管理、收藏管理和上传功能。
>
   > **📋待办：** 概览页、通知页、用户设置页

1. **资产：管理用户自己上传的所有模板**

   > 提供下载最新版本和查看详情的能力。
   >
   > **📋待办：** 更新模板信息功能

   ![img_1.png](/img/template-marketplace/user-center-asset.png)

   ![img.png](/img/template-marketplace/asset-detail.png)

2. **版本升级**

   > 用户在该模板族下定义新版本号，更新版本信息，并上传最新版本的文件。

   ![img.png](/img/template-marketplace/asset-upgrade.png)

3. **收藏**

   ![img.png](/img/template-marketplace/user-center-star.png)

   ![img.png](/img/template-marketplace/user-center-star-detail.png)

4. **上传**

   > 创建新的模板系列并上传第一个版本的文件。
   >
   > 填写模板名称，选择模板类别，填写描述信息和版本信息，并上传文件。

   ![img.png](/img/template-marketplace/user-center-upload.png)

### 注册与登录

💡 访客可用

1. **注册**

   > 用户名可重复，但邮箱地址唯一。
   >
   > **📋待办：** 验证码功能、邮箱验证功能

   ![img.png](/img/template-marketplace/sign-up.png)

2. **登录**

   > **📋待办：** 验证码功能和忘记密码功能

   ![img.png](/img/template-marketplace/email-login.png)

## 开发步骤

   > 分别下载 `template-marketplace/hertzbeat-template-hub` 和 `template-marketplace/hertzbeat-template-hub-web-app` 项目

   前端项目按照 README.md 直接启动即可。

   后端项目步骤：

   1. 在 `template-marketplace/hertzbeat-template-hub/sql` 中运行 `sql` 脚本创建数据库表
   2. 安装 MinIO
   3. 在 `application.yml` 中配置 `MySQL` 和 `MinIO`
   4. 启动后端项目

其他问题可通过交流群或 ISSUE 反馈！
