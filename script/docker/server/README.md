## Use the buildx to build Docker images that support multiple system architectures

> https://vuepress.mirror.docker-practice.com/buildx/multi-arch-images/


```shell
$ docker buildx create --use --name=mybuilder-cn --driver docker-container --driver-opt image=dockerpracticesig/buildkit:master

# for tencent environment
$ docker buildx create --use --name=mybuilder-cn --driver docker-container --driver-opt image=dockerpracticesig/buildkit:master-tencent

$ docker buildx create --use --name mybuilder --driver docker-container

$ docker buildx use mybuilder

```

#### Build the image  

```shell
# Use the --platform flag to specify the target platforms for the build --push flag to push the image to a registry
$ docker buildx build --platform linux/arm64,linux/amd64 -t apache/hertzbeat:1.0.0 . --push

$ docker buildx build --platform linux/arm64,linux/amd64 -t quay.io/tancloud/hertzbeat:latest . --push

# Inspect the image info
$ docker buildx imagetools inspect apache/hertzbeat:1.0.0
```
