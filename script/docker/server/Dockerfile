FROM openjdk:11.0.16-jre-slim-buster

# add args version
ARG VERSION

MAINTAINER tancloud "tomsun28@outlook.com"

# Install SSH
RUN apt-get update && apt-get install -y openssh-server 
RUN mkdir /var/run/sshd

ADD hertzbeat-${VERSION}.tar /opt/

ENV TZ=Asia/Shanghai
ENV LANG=en_US.UTF-8

EXPOSE 1157 1158 22

WORKDIR /opt/hertzbeat/

ENTRYPOINT ["./bin/entrypoint.sh"]
