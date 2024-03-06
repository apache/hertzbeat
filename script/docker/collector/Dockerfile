FROM openjdk:17-slim-buster

ARG VERSION

MAINTAINER tancloud "tomsun28@outlook.com"

# Install SSH
RUN apt-get update && apt-get install -y openssh-server 
RUN mkdir /var/run/sshd

ADD hertzbeat-collector-${VERSION}.tar /opt/

ENV TZ=Asia/Shanghai
ENV LANG=en_US.UTF-8

WORKDIR /opt/hertzbeat-collector/

ENTRYPOINT ["./bin/entrypoint.sh"]
