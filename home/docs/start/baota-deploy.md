---
id: baota-deploy  
title: Use BaoTa Panel Deploy HertzBeat  
sidebar_label: Install via BaoTa
---

Apache HertzBeat (incubating) supports one-click deployment in the `Docker` application store of the BaoTa panel.

## Prerequisites

Install BaoTa panel, see [BaoTa Panel Quick Install](https://www.bt.cn/new/download.html).

## Install Docker

> Install the Docker service in the BaoTa panel, skip if you already have it.

Log in to the BaoTa panel, click `Docker` in the left menu, and install the `Docker` and `Docker Compose` services as prompted.

## Deploy HertzBeat

Look for `HertzBeat` in the `Application Store` in the `Docker` section of the left menu in the BaoTa panel, and you can install it quickly.

![HertzBeat](/img/docs/start/install-to-baota-1.png)

Click `Install`, configure the name, version, access, etc. as prompted, and wait for the installation to complete.

![HertzBeat](/img/docs/start/install-to-baota-2.png)


## Access HertzBeat

After the installation is complete, visit `http://<BaoTa panel IP>:1157` in your browser to access the HertzBeat console.
