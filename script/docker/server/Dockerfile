FROM openjdk:11.0.16-jre-slim-buster

MAINTAINER tancloud "tomsun28@outlook.com"

# Install SSH
RUN apt-get update && apt-get install -y openssh-server 
RUN mkdir /var/run/sshd

ADD hertzbeat-1.3.2.tar /opt/

ENV TZ=Asia/Shanghai
#ENV LANG=zh_CN.UTF-8

EXPOSE 1157 22

WORKDIR /opt/hertzbeat/

ENTRYPOINT ["./bin/entrypoint.sh"]
