FROM public.ecr.aws/ubuntu/ubuntu:24.04@sha256:a54764b5b6340c272ffb45e303fe4c8064bbdfb76d732b325b79ae6b92900e4c

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install --yes --no-install-recommends \
        openssh-server \
        procps \
        util-linux \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /run/sshd \
    && printf 'PermitRootLogin yes\nPasswordAuthentication yes\nUsePAM no\n' \
        > /etc/ssh/sshd_config.d/hertzbeat-e2e.conf

EXPOSE 22

CMD ["/usr/sbin/sshd", "-D", "-e"]
