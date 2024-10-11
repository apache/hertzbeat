---
id: baota-deploy  
title: 使用 宝塔面板 部署 HertzBeat    
sidebar_label: 基于宝塔面板部署
---

Apache HertzBeat (incubating) 支持在宝塔面板的 `Docker` 应用商店一键部署。

## 前提

安装宝塔面板，前往[宝塔面板](https://www.bt.cn/new/index.html)官网，选择对应的脚本下载安装。

## 部署

1. 登录宝塔面板，在菜单栏中点击 `Docker`，根据提示安装 `Docker` 和 `Docker Compose` 服务。

    > 在宝塔面板安装 Docker 服务，若已有则跳过。

    ![HertzBeat](/img/docs/start/install-to-baota-1.png)

2. 在`Docker-应用商店`中找到 `HertzBeat`，点击`安装`

    ![HertzBeat](/img/docs/start/install-to-baota-2.png)

3. 设置域名等基本信息，点击`确定`

    ![HertzBeat](/img/docs/start/install-to-baota-3.png)

    - 名称：应用名称，默认`HertzBeat-随机字符`
    - 版本选择：默认`latest`
    - 域名：如需通过域名直接访问，请在此配置域名并将域名解析到服务器
    - 允许外部访问：如您需通过`IP+Port`直接访问，请勾选，如您已经设置了域名，请不要勾选此处
    - 端口：默认`1157`，可自行修改

4. 提交后面板会自动进行应用初始化，大概需要`1-3`分钟，初始化完成后即可访问。

## 访问 HertzBeat

- 如您设置了域名，请直接在浏览器地址栏中输入域名访问，如`http://demo.hertzbeat.apache.org`，即可访问 `HertzBeat` 控制台。
- 如您选择了通过`IP+Port`访问，请在浏览器地址栏中输入域名访问 `http://<宝塔面板IP>:1157`，即可访问 `HertzBeat` 控制台。

![HertzBeat](/img/home/0.png)

> 默认用户名`admin`默认密码`hertzbeat`
