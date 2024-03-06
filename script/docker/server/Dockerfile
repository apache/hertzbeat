FROM openjdk:17-slim-buster

# add args version
ARG VERSION

MAINTAINER tancloud "tomsun28@outlook.com"

# Install SSH And Locales
RUN apt-get update && apt-get install -y openssh-server && apt-get install -y locales
RUN mkdir /var/run/sshd
# Build zh_CN en_US locale resource package
RUN localedef -c -f UTF-8 -i zh_CN zh_CN.UTF-8
RUN localedef -c -f UTF-8 -i en_US en_US.UTF-8

ADD hertzbeat-${VERSION}.tar /opt/

ENV TZ=Asia/Shanghai
ENV LANG=en_US.UTF-8

EXPOSE 1157 1158 22

WORKDIR /opt/hertzbeat/

ENTRYPOINT ["./bin/entrypoint.sh"]
