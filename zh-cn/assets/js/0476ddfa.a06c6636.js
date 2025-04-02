"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[92079],{15680:(e,r,n)=>{n.d(r,{xA:()=>l,yg:()=>u});var t=n(96540);function a(e,r,n){return r in e?Object.defineProperty(e,r,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[r]=n,e}function s(e,r){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var t=Object.getOwnPropertySymbols(e);r&&(t=t.filter((function(r){return Object.getOwnPropertyDescriptor(e,r).enumerable}))),n.push.apply(n,t)}return n}function i(e){for(var r=1;r<arguments.length;r++){var n=null!=arguments[r]?arguments[r]:{};r%2?s(Object(n),!0).forEach((function(r){a(e,r,n[r])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):s(Object(n)).forEach((function(r){Object.defineProperty(e,r,Object.getOwnPropertyDescriptor(n,r))}))}return e}function o(e,r){if(null==e)return{};var n,t,a=function(e,r){if(null==e)return{};var n,t,a={},s=Object.keys(e);for(t=0;t<s.length;t++)n=s[t],r.indexOf(n)>=0||(a[n]=e[n]);return a}(e,r);if(Object.getOwnPropertySymbols){var s=Object.getOwnPropertySymbols(e);for(t=0;t<s.length;t++)n=s[t],r.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var c=t.createContext({}),d=function(e){var r=t.useContext(c),n=r;return e&&(n="function"==typeof e?e(r):i(i({},r),e)),n},l=function(e){var r=d(e.components);return t.createElement(c.Provider,{value:r},e.children)},p={inlineCode:"code",wrapper:function(e){var r=e.children;return t.createElement(t.Fragment,{},r)}},m=t.forwardRef((function(e,r){var n=e.components,a=e.mdxType,s=e.originalType,c=e.parentName,l=o(e,["components","mdxType","originalType","parentName"]),m=d(n),u=a,f=m["".concat(c,".").concat(u)]||m[u]||p[u]||s;return n?t.createElement(f,i(i({ref:r},l),{},{components:n})):t.createElement(f,i({ref:r},l))}));function u(e,r){var n=arguments,a=r&&r.mdxType;if("string"==typeof e||a){var s=n.length,i=new Array(s);i[0]=m;var o={};for(var c in r)hasOwnProperty.call(r,c)&&(o[c]=r[c]);o.originalType=e,o.mdxType="string"==typeof e?e:a,i[1]=o;for(var d=2;d<s;d++)i[d]=n[d];return t.createElement.apply(null,i)}return t.createElement.apply(null,n)}m.displayName="MDXCreateElement"},93715:(e,r,n)=>{n.r(r),n.d(r,{assets:()=>c,contentTitle:()=>i,default:()=>p,frontMatter:()=>s,metadata:()=>o,toc:()=>d});var t=n(58168),a=(n(96540),n(15680));const s={id:"redis_cluster",title:"\u76d1\u63a7\uff1aRedis Cluster \u6570\u636e\u5e93\u76d1\u63a7",sidebar_label:"Redis Cluster\u6570\u636e\u5e93",keywords:["\u5f00\u6e90\u76d1\u63a7\u7cfb\u7edf","\u5f00\u6e90\u6570\u636e\u5e93\u76d1\u63a7","RedisCluster\u6570\u636e\u5e93\u76d1\u63a7"]},i=void 0,o={unversionedId:"help/redis_cluster",id:"version-v1.6.x/help/redis_cluster",title:"\u76d1\u63a7\uff1aRedis Cluster \u6570\u636e\u5e93\u76d1\u63a7",description:"Pre-monitoring operations",source:"@site/i18n/zh-cn/docusaurus-plugin-content-docs/version-v1.6.x/help/redis_cluster.md",sourceDirName:"help",slug:"/help/redis_cluster",permalink:"/zh-cn/docs/v1.6.x/help/redis_cluster",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/i18n/zh-cn/docusaurus-plugin-content-docs/version-v1.6.x/help/redis_cluster.md",tags:[],version:"v1.6.x",frontMatter:{id:"redis_cluster",title:"\u76d1\u63a7\uff1aRedis Cluster \u6570\u636e\u5e93\u76d1\u63a7",sidebar_label:"Redis Cluster\u6570\u636e\u5e93",keywords:["\u5f00\u6e90\u76d1\u63a7\u7cfb\u7edf","\u5f00\u6e90\u6570\u636e\u5e93\u76d1\u63a7","RedisCluster\u6570\u636e\u5e93\u76d1\u63a7"]}},c={},d=[{value:"Pre-monitoring operations",id:"pre-monitoring-operations",level:3},{value:"Configuration Parameters",id:"configuration-parameters",level:3}],l={toc:d};function p(e){let{components:r,...s}=e;return(0,a.yg)("wrapper",(0,t.A)({},l,s,{components:r,mdxType:"MDXLayout"}),(0,a.yg)("h3",{id:"pre-monitoring-operations"},"Pre-monitoring operations"),(0,a.yg)("ol",null,(0,a.yg)("li",{parentName:"ol"},(0,a.yg)("p",{parentName:"li"},"\u521b\u5efa\u4e00\u4e2a\u7a7a\u76ee\u5f55, \u7136\u540e\u5728\u76ee\u5f55\u4e0b\u6dfb\u52a0\u4ee5\u4e0b\u4e24\u4e2a\u6587\u4ef6."),(0,a.yg)("p",{parentName:"li"},(0,a.yg)("em",{parentName:"p"},"redis.config")),(0,a.yg)("pre",{parentName:"li"},(0,a.yg)("code",{parentName:"pre",className:"language-properties"},"  port 6379\n  cluster-enabled yes\n  cluster-config-file nodes.conf\n  cluster-node-timeout 5000\n  appendonly yes\n  bind 0.0.0.0\n  protected-mode no\n\n")),(0,a.yg)("p",{parentName:"li"},(0,a.yg)("em",{parentName:"p"},"docker-compose.yml")),(0,a.yg)("pre",{parentName:"li"},(0,a.yg)("code",{parentName:"pre",className:"language-yml"},'services:\n  redis-master-1:\n    image: redis:latest\n    container_name: redis-master-1\n    command: ["redis-server", "/usr/local/etc/redis/redis.conf"]\n    volumes:\n      - ./redis.conf:/usr/local/etc/redis/redis.conf\n    ports:\n      - "1000:6379"\n\n  redis-master-2:\n    image: redis:latest\n    container_name: redis-master-2\n    command: ["redis-server", "/usr/local/etc/redis/redis.conf"]\n    volumes:\n      - ./redis.conf:/usr/local/etc/redis/redis.conf\n    ports:\n      - "2000:6379"\n\n  redis-master-3:\n    image: redis:latest\n    container_name: redis-master-3\n    command: ["redis-server", "/usr/local/etc/redis/redis.conf"]\n    volumes:\n      - ./redis.conf:/usr/local/etc/redis/redis.conf\n    ports:\n      - "3000:6379"\n\n  redis-slave-1:\n    image: redis:latest\n    container_name: redis-slave-1\n    command: ["redis-server", "/usr/local/etc/redis/redis.conf"]\n    volumes:\n      - ./redis.conf:/usr/local/etc/redis/redis.conf\n    ports:\n      - "1001:6379"\n\n  redis-slave-2:\n    image: redis:latest\n    container_name: redis-slave-2\n    command: ["redis-server", "/usr/local/etc/redis/redis.conf"]\n    volumes:\n      - ./redis.conf:/usr/local/etc/redis/redis.conf\n    ports:\n      - "2001:6379"\n\n  redis-slave-3:\n    image: redis:latest\n    container_name: redis-slave-3\n    command: ["redis-server", "/usr/local/etc/redis/redis.conf"]\n    volumes:\n      - ./redis.conf:/usr/local/etc/redis/redis.conf\n    ports:\n      - "3001:6379"\n\nnetworks:\n  default:\n    external:\n      name: hertzbeat-redis-cluster\n'))),(0,a.yg)("li",{parentName:"ol"},(0,a.yg)("p",{parentName:"li"},"\u67e5\u770b\u6240\u6709\u5bb9\u5668\u7684 IP \u5730\u5740\uff0c\u642d\u5efa Redis \u96c6\u7fa4\u65f6\u9700\u8981\u7528\u5230\u8fd9\u4e9b."),(0,a.yg)("pre",{parentName:"li"},(0,a.yg)("code",{parentName:"pre",className:"language-bash"},"docker-compose up -d\ndocker network inspect hertzbeat-redis-cluste\n")),(0,a.yg)("pre",{parentName:"li"},(0,a.yg)("code",{parentName:"pre",className:"language-json"},'"Containers": {\n            "187b879f73c473b3cbb82ff95f668e65af46115ddaa27f3ff1a712332b981531": {\n                ...\n                "Name": "redis-slave-2",\n                "IPv4Address": "192.168.117.6/24", \n                ...\n            },\n            "45e22b64c82e51857fc104436cdd6cc0c5776ad10a2e4b9d8e52e36cfb87217e": {\n                ...\n                "Name": "redis-master-3",\n                "IPv4Address": "192.168.117.3/24\n                ...\n            },\n            "57838ae37956f8af181f9a131eb011efec332b9ed3d49480f59d8962ececf288": {\n                ...\n                "Name": "redis-master-2",\n                "IPv4Address": "192.168.117.7/24",\n                ...\n            },\n            "94478d14bd950bcde533134870beb89b392515843027a0595af56dd1e3305a76": {\n                ...\n                "Name": "redis-master-1",\n                "IPv4Address": "192.168.117.4/24",\n                ...\n            },\n            "ad055720747e7fc430ba794d5321723740eeb345c280073e4292ed4302ff657c": {\n                ...\n                "Name": "redis-slave-3",\n                "IPv4Address": "192.168.117.2/24",\n                ...\n            },\n            "eddded1ac4c7528640ba0c6befbdaa48faa7cb13905b934ca1f5c69ab364c725": {\n                ...\n                "Name": "redis-slave-1",\n                "IPv4Address": "192.168.117.5/24",\n                ...\n            }\n        },\n'))),(0,a.yg)("li",{parentName:"ol"},(0,a.yg)("p",{parentName:"li"},"\u8fdb\u5165\u5bb9\u5668, \u7136\u540e\u6784\u5efa\u96c6\u7fa4."),(0,a.yg)("pre",{parentName:"li"},(0,a.yg)("code",{parentName:"pre",className:"language-bash"},"docker exec -it redis-master-1 /bin/bash\n")),(0,a.yg)("pre",{parentName:"li"},(0,a.yg)("code",{parentName:"pre",className:"language-bash"},"redis-cli --cluster create \\\n192.168.117.4:6379 \\\n192.168.117.7:6379 \\\n192.168.117.3:6379 \\\n192.168.117.5:6379 \\\n192.168.117.6:6379 \\\n192.168.117.2:6379 \\\n--cluster-replicas 1\n"))),(0,a.yg)("li",{parentName:"ol"},(0,a.yg)("p",{parentName:"li"},"\u6700\u7ec8\u7684\u6548\u679c."),(0,a.yg)("p",{parentName:"li"},"\u6dfb\u52a0\u76d1\u63a7\u8282\u70b9\u65f6\u586b\u5165\u6240\u9700\u8981\u7684\u53c2\u6570."),(0,a.yg)("p",{parentName:"li"},(0,a.yg)("img",{alt:"HertzBeat",src:n(90490).A,width:"3834",height:"1988"})),(0,a.yg)("p",{parentName:"li"},"\u6700\u7ec8\u7684\u6548\u679c."),(0,a.yg)("p",{parentName:"li"},(0,a.yg)("img",{alt:"HertzBeat",src:n(34864).A,width:"3834",height:"1698"})))),(0,a.yg)("h3",{id:"configuration-parameters"},"Configuration Parameters"),(0,a.yg)("p",null,"   \u67e5\u770b ",(0,a.yg)("a",{parentName:"p",href:"https://hertzbeat.apache.org/docs/help/redis"},"REDIS")," \u6587\u6863."))}p.isMDXComponent=!0},90490:(e,r,n)=>{n.d(r,{A:()=>t});const t=n.p+"assets/images/redis-cluster-add-de7cf3faa441d4e6fac6439798780bb1.png"},34864:(e,r,n)=>{n.d(r,{A:()=>t});const t=n.p+"assets/images/redis-cluster-view-8f80d8aff6899575dea38703c838a935.png"}}]);