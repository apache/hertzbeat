---
id: baota-deploy  
title: Use BaoTa Panel Deploy HertzBeat  
sidebar_label: Install via BaoTa
---

Apache HertzBeat (incubating) supports one-click deployment in the `Docker` application store of the BaoTa panel.

## Prerequisites

Install Baota Panel, go to the [BaoTa Panel Website](https://www.bt.cn/new/index.html), switch the script and install.

## Install

1. Log in to the Baota Panel, click `Docker` menu and install the `Docker` `Docker Compose` according the prompts.     

    > Install the Docker service, skip if it already exists.   

    ![HertzBeat](/img/docs/start/install-to-baota-1.png)

2. Find `HertzBeat` in `Docker App Store` and click `Install`

    ![HertzBeat](/img/docs/start/install-to-baota-2.png)   

3. Config the domain, name and other info, click `OK`

    ![HertzBeat](/img/docs/start/install-to-baota-3.png)
    - Name: App name, default the `HertzBeat-random`
    - Version：Default `latest`
    - Domain：Config if you need domain access, please configure the domain name here and resolve the domain name to the server 
    - Allow External Access：If you need to access directly through `IP+Port`, please check it. If you have already set the domain name, please do not check here 
    - Port：Default `1157`

4. After submission, the panel will automatically initialize the application, which takes about `1-3` minutes. After the initialization is completed, you can access it.

## Access HertzBeat

- If you have set a domain name, please enter the domain name directly in the browser address bar to access, such as `http://demo.hertzbeat.apache.org`, you can access the `HertzBeat` console.
- If you choose to access via `IP+Port`, please enter the domain name in the browser address bar to access `http://<Baota Panel IP>:1157`, you can access the `HertzBeat` console.

![HertzBeat](/img/home/0.png)

> Default account username: `admin` password: `hertzbeat`
