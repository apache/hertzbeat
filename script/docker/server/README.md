## 使用 buildx 构建多种系统架构支持的 Docker 镜像   

> https://vuepress.mirror.docker-practice.com/buildx/multi-arch-images/  

#### 新建 builder 实例   

```shell
# 适用于国内环境
$ docker buildx create --use --name=mybuilder-cn --driver docker-container --driver-opt image=dockerpracticesig/buildkit:master

# 适用于腾讯云环境(腾讯云主机、coding.net 持续集成)
$ docker buildx create --use --name=mybuilder-cn --driver docker-container --driver-opt image=dockerpracticesig/buildkit:master-tencent

# 原始
$ docker buildx create --use --name mybuilder --driver docker-container

$ docker buildx use mybuilder

```

#### 构建镜像  

```shell
# 使用 $ docker buildx build 命令构建镜像, --push 参数表示将构建好的镜像推送到 Docker 仓库
$ docker buildx build --platform linux/arm64,linux/amd64 -t tancloud/hertzbeat:v1.0.0 . --push

$ docker buildx build --platform linux/arm64,linux/amd64 -t quay.io/tancloud/hertzbeat:latest . --push

# 查看镜像信息
$ docker buildx imagetools inspect tancloud/hertzbeat:v1.0.0

```
