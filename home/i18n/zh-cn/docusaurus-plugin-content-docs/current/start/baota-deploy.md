---
id: baota-deploy  
title: 使用 宝塔面板 部署 HertzBeat    
sidebar_label: 基于宝塔面板部署
---

Apache HertzBeat (incubating) 支持在宝塔面板的 `Docker` 应用商店一键部署。

## 前提

安装宝塔面板，请参阅 [宝塔面板快速安装](https://www.bt.cn/new/download.html)。

## 安装 Docker

> 在宝塔面板安装 Docker 服务，若已有则跳过。

登录宝塔面板，点击左侧菜单中的 `Docker`，根据提示安装 `Docker` 和 `Docker Compose` 服务。

## 部署 HertzBeat

登录宝塔面板，点击左侧菜单中的 `应用商店`，在搜索框中搜索 `HertzBeat`，即可快速安装。

## 开放端口

> HertzBeat 默认使用 `1157` 端口，需要在安全组中开放此端口。

登录宝塔面板，点击左侧菜单中的 `安全`，在 `防火墙` 中添加 `1157` 端口放行。

## 访问 HertzBeat

浏览器访问 `http://<宝塔面板IP>:1157`，即可访问 HertzBeat 控制台。
