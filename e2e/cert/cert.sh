# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.


#!/bin/bash

# 创建证书目录并进入
CERT_DIR="emqx-certs-$(date +%s)"
mkdir -p "$CERT_DIR" && cd "$CERT_DIR"

# 1. 生成 CA 根证书
openssl genrsa -out ca.key 2048
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out ca.crt \
  -subj "/C=CN/ST=Test/L=Test/O=Test/CN=HertzBeat Test CA"

# 2. 创建服务端证书配置
cat <<EOF >server.ext
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
EOF

# 3. 生成服务器密钥和证书请求
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr \
  -subj "/C=CN/ST=Test/L=Test/O=Test/CN=localhost"

# 4. 使用CA签发服务器证书
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days 3650 -sha256 -extfile server.ext

# 5. 创建客户端证书配置
cat <<EOF >client.ext
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment
extendedKeyUsage = clientAuth
EOF

# 6. 生成客户端密钥和证书请求
openssl genrsa -out client.key 2048
openssl req -new -key client.key -out client.csr \
  -subj "/C=CN/ST=Test/L=Test/O=Test/CN=hertzbeat-client"

# 7. 使用CA签发客户端证书
openssl x509 -req -in client.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out client.crt -days 3650 -sha256 -extfile client.ext

# 8. 合并服务端证书链
cat server.crt ca.crt > server-fullchain.crt

# 9. 验证所有文件
echo -e "\n\033[1;32m=== 证书验证 ===\033[0m"
echo -e "\033[1;33m生成文件列表:\033[0m"
ls -lh

echo -e "\n\033[1;33m服务端证书信息:\033[0m"
openssl x509 -in server.crt -text -noout | grep -E "Issuer|Subject|DNS|Not"

echo -e "\n\033[1;33m密钥匹配检查:\033[0m"
echo "服务端密钥:"
openssl rsa -in server.key -noout -check | head -1

echo -e "\n服务端证书公钥摘要:"
openssl x509 -in server.crt -pubkey -noout | openssl sha256

echo -e "\n服务端密钥公钥摘要:"
openssl rsa -in server.key -pubout | openssl sha256

# 10. 清理临时文件
rm -f server.ext client.ext *.csr *.srl

echo -e "\n\033[1;32m=== 证书生成成功! ===\033[0m"
echo "证书目录: $(pwd)"
