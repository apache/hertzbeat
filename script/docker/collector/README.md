## Use the buildx to build Docker images that support multiple system architectures

> https://vuepress.mirror.docker-practice.com/buildx/multi-arch-images/  


```shell
$ docker buildx create --use --name=mybuilder-cn --driver docker-container --driver-opt image=dockerpracticesig/buildkit:master

# for tencent environment
$ docker buildx create --use --name=mybuilder-cn --driver docker-container --driver-opt image=dockerpracticesig/buildkit:master-tencent

$ docker buildx create --use --name mybuilder --driver docker-container

$ docker buildx use mybuilder

```

## Native Hybrid Collector image

The Native image has no JVM layer. Build the Linux amd64 and arm64 Native
Collector archives first, then normalize their names in the Docker context:

```shell
cp dist/apache-hertzbeat-collector-native-*-linux-amd64-bin.tar.gz dist/collector-native-linux-amd64.tar.gz
cp dist/apache-hertzbeat-collector-native-*-linux-arm64-bin.tar.gz dist/collector-native-linux-arm64.tar.gz
docker buildx build --platform linux/amd64,linux/arm64 \
  -f script/docker/collector/Dockerfile.native dist
```

The image starts `bin/foreground.sh` directly as the non-root `hertzbeat` user,
so SIGTERM reaches the Java Native parent and its supervised Go child. Mount
explicit read-only paths for managed file-log profiles and persist `data/` when
offset recovery is required.

#### Build the image  

```shell
# Use the --platform flag to specify the target platforms for the build --push flag to push the image to a registry
$ docker buildx build --platform linux/arm64,linux/amd64 -t apache/hertzbeat-collector:1.0.0 . --push

$ docker buildx build --platform linux/arm64,linux/amd64 -t quay.io/tancloud/hertzbeat-collector:latest . --push

# Inspect the image info
$ docker buildx imagetools inspect apache/hertzbeat-collector:1.0.0

```
