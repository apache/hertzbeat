"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[8837],{15680:(e,t,a)=>{a.d(t,{xA:()=>g,yg:()=>s});var r=a(96540);function n(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function l(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,r)}return a}function i(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?l(Object(a),!0).forEach((function(t){n(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):l(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function o(e,t){if(null==e)return{};var a,r,n=function(e,t){if(null==e)return{};var a,r,n={},l=Object.keys(e);for(r=0;r<l.length;r++)a=l[r],t.indexOf(a)>=0||(n[a]=e[a]);return n}(e,t);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);for(r=0;r<l.length;r++)a=l[r],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(n[a]=e[a])}return n}var p=r.createContext({}),c=function(e){var t=r.useContext(p),a=t;return e&&(a="function"==typeof e?e(t):i(i({},t),e)),a},g=function(e){var t=c(e.components);return r.createElement(p.Provider,{value:t},e.children)},m={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},y=r.forwardRef((function(e,t){var a=e.components,n=e.mdxType,l=e.originalType,p=e.parentName,g=o(e,["components","mdxType","originalType","parentName"]),y=c(a),s=n,u=y["".concat(p,".").concat(s)]||y[s]||m[s]||l;return a?r.createElement(u,i(i({ref:t},g),{},{components:a})):r.createElement(u,i({ref:t},g))}));function s(e,t){var a=arguments,n=t&&t.mdxType;if("string"==typeof e||n){var l=a.length,i=new Array(l);i[0]=y;var o={};for(var p in t)hasOwnProperty.call(t,p)&&(o[p]=t[p]);o.originalType=e,o.mdxType="string"==typeof e?e:n,i[1]=o;for(var c=2;c<l;c++)i[c]=a[c];return r.createElement.apply(null,i)}return r.createElement.apply(null,a)}y.displayName="MDXCreateElement"},49728:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>p,contentTitle:()=>i,default:()=>m,frontMatter:()=>l,metadata:()=>o,toc:()=>c});var r=a(58168),n=(a(96540),a(15680));const l={id:"quickstart",title:"\u5feb\u901f\u5f00\u59cb",sidebar_label:"\u5feb\u901f\u5f00\u59cb"},i=void 0,o={unversionedId:"start/quickstart",id:"start/quickstart",title:"\u5feb\u901f\u5f00\u59cb",description:"\ud83d\udc15 \u5f00\u59cb\u4f7f\u7528",source:"@site/i18n/zh-cn/docusaurus-plugin-content-docs/current/start/quickstart.md",sourceDirName:"start",slug:"/start/quickstart",permalink:"/zh-cn/docs/start/quickstart",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/i18n/zh-cn/docusaurus-plugin-content-docs/current/start/quickstart.md",tags:[],version:"current",frontMatter:{id:"quickstart",title:"\u5feb\u901f\u5f00\u59cb",sidebar_label:"\u5feb\u901f\u5f00\u59cb"}},p={},c=[{value:"\ud83d\udc15 \u5f00\u59cb\u4f7f\u7528",id:"-\u5f00\u59cb\u4f7f\u7528",level:3},{value:"\ud83c\udf5e HertzBeat\u5b89\u88c5",id:"-hertzbeat\u5b89\u88c5",level:3},{value:"\u65b9\u5f0f\u4e00\uff1aDocker\u65b9\u5f0f\u5feb\u901f\u5b89\u88c5",id:"\u65b9\u5f0f\u4e00docker\u65b9\u5f0f\u5feb\u901f\u5b89\u88c5",level:4},{value:"\u65b9\u5f0f\u4e8c\uff1a\u901a\u8fc7\u5b89\u88c5\u5305\u5b89\u88c5",id:"\u65b9\u5f0f\u4e8c\u901a\u8fc7\u5b89\u88c5\u5305\u5b89\u88c5",level:4},{value:"\u65b9\u5f0f\u4e09\uff1a\u672c\u5730\u4ee3\u7801\u542f\u52a8",id:"\u65b9\u5f0f\u4e09\u672c\u5730\u4ee3\u7801\u542f\u52a8",level:4},{value:"\u65b9\u5f0f\u56db\uff1aDocker-Compose \u7edf\u4e00\u5b89\u88c5 hertzbeat+postgresql+tsdb",id:"\u65b9\u5f0f\u56dbdocker-compose-\u7edf\u4e00\u5b89\u88c5-hertzbeatpostgresqltsdb",level:5},{value:"\u65b9\u5f0f\u4e94\uff1aKubernetes Helm Charts \u90e8\u7f72 hertzbeat+collector+postgresql+tsdb",id:"\u65b9\u5f0f\u4e94kubernetes-helm-charts-\u90e8\u7f72-hertzbeatcollectorpostgresqltsdb",level:5}],g={toc:c};function m(e){let{components:t,...a}=e;return(0,n.yg)("wrapper",(0,r.A)({},g,a,{components:t,mdxType:"MDXLayout"}),(0,n.yg)("h3",{id:"-\u5f00\u59cb\u4f7f\u7528"},"\ud83d\udc15 \u5f00\u59cb\u4f7f\u7528"),(0,n.yg)("ul",null,(0,n.yg)("li",{parentName:"ul"},"\u5982\u679c\u60a8\u662f\u60f3\u5c06 Apache HertzBeat (incubating) \u90e8\u7f72\u5230\u672c\u5730\u642d\u5efa\u76d1\u63a7\u7cfb\u7edf\uff0c\u8bf7\u53c2\u8003\u4e0b\u9762\u7684\u90e8\u7f72\u6587\u6863\u8fdb\u884c\u64cd\u4f5c\u3002")),(0,n.yg)("h3",{id:"-hertzbeat\u5b89\u88c5"},"\ud83c\udf5e HertzBeat\u5b89\u88c5"),(0,n.yg)("blockquote",null,(0,n.yg)("p",{parentName:"blockquote"},"HertzBeat\u652f\u6301\u901a\u8fc7\u6e90\u7801\u5b89\u88c5\u542f\u52a8\uff0cDocker\u5bb9\u5668\u8fd0\u884c\u548c\u5b89\u88c5\u5305\u65b9\u5f0f\u5b89\u88c5\u90e8\u7f72\uff0cCPU\u67b6\u6784\u652f\u6301X86/ARM64\u3002")),(0,n.yg)("h4",{id:"\u65b9\u5f0f\u4e00docker\u65b9\u5f0f\u5feb\u901f\u5b89\u88c5"},"\u65b9\u5f0f\u4e00\uff1aDocker\u65b9\u5f0f\u5feb\u901f\u5b89\u88c5"),(0,n.yg)("ol",null,(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("inlineCode",{parentName:"li"},"docker")," \u73af\u5883\u4ec5\u9700\u4e00\u6761\u547d\u4ee4\u5373\u53ef\u5f00\u59cb")),(0,n.yg)("p",null,(0,n.yg)("inlineCode",{parentName:"p"},"docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat")),(0,n.yg)("p",null,(0,n.yg)("inlineCode",{parentName:"p"},"\u6216\u8005\u4f7f\u7528 quay.io (\u82e5 dockerhub \u7f51\u7edc\u94fe\u63a5\u8d85\u65f6)")),(0,n.yg)("p",null,(0,n.yg)("inlineCode",{parentName:"p"},"docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat quay.io/tancloud/hertzbeat")),(0,n.yg)("ol",{start:2},(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u6d4f\u89c8\u5668\u8bbf\u95ee ",(0,n.yg)("inlineCode",{parentName:"p"},"http://localhost:1157")," \u5373\u53ef\u5f00\u59cb\uff0c\u9ed8\u8ba4\u8d26\u53f7\u5bc6\u7801 ",(0,n.yg)("inlineCode",{parentName:"p"},"admin/hertzbeat"))),(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u90e8\u7f72\u91c7\u96c6\u5668\u96c6\u7fa4(\u53ef\u9009)"))),(0,n.yg)("pre",null,(0,n.yg)("code",{parentName:"pre"},"docker run -d -e IDENTITY=custom-collector-name -e MANAGER_HOST=127.0.0.1 -e MANAGER_PORT=1158 --name hertzbeat-collector apache/hertzbeat-collector\n")),(0,n.yg)("ul",null,(0,n.yg)("li",{parentName:"ul"},(0,n.yg)("inlineCode",{parentName:"li"},"-e IDENTITY=custom-collector-name")," : \u914d\u7f6e\u6b64\u91c7\u96c6\u5668\u7684\u552f\u4e00\u6027\u6807\u8bc6\u7b26\u540d\u79f0\uff0c\u591a\u4e2a\u91c7\u96c6\u5668\u540d\u79f0\u4e0d\u80fd\u76f8\u540c\uff0c\u5efa\u8bae\u81ea\u5b9a\u4e49\u82f1\u6587\u540d\u79f0\u3002"),(0,n.yg)("li",{parentName:"ul"},(0,n.yg)("inlineCode",{parentName:"li"},"-e MODE=public")," : \u914d\u7f6e\u8fd0\u884c\u6a21\u5f0f(public or private), \u516c\u5171\u96c6\u7fa4\u6a21\u5f0f\u6216\u79c1\u6709\u4e91\u8fb9\u6a21\u5f0f\u3002"),(0,n.yg)("li",{parentName:"ul"},(0,n.yg)("inlineCode",{parentName:"li"},"-e MANAGER_HOST=127.0.0.1")," : \u914d\u7f6e\u8fde\u63a5\u4e3bHertzBeat\u670d\u52a1\u7684\u5bf9\u5916IP\u3002"),(0,n.yg)("li",{parentName:"ul"},(0,n.yg)("inlineCode",{parentName:"li"},"-e MANAGER_PORT=1158")," : \u914d\u7f6e\u8fde\u63a5\u4e3bHertzBeat\u670d\u52a1\u7684\u5bf9\u5916\u7aef\u53e3\uff0c\u9ed8\u8ba41158\u3002")),(0,n.yg)("p",null,"\u66f4\u591a\u914d\u7f6e\u8be6\u7ec6\u6b65\u9aa4\u53c2\u8003 ",(0,n.yg)("a",{parentName:"p",href:"docker-deploy"},"\u901a\u8fc7Docker\u65b9\u5f0f\u5b89\u88c5HertzBeat")," "),(0,n.yg)("h4",{id:"\u65b9\u5f0f\u4e8c\u901a\u8fc7\u5b89\u88c5\u5305\u5b89\u88c5"},"\u65b9\u5f0f\u4e8c\uff1a\u901a\u8fc7\u5b89\u88c5\u5305\u5b89\u88c5"),(0,n.yg)("ol",null,(0,n.yg)("li",{parentName:"ol"},"\u4e0b\u8f7d\u60a8\u7cfb\u7edf\u73af\u5883\u5bf9\u5e94\u7684\u5b89\u88c5\u5305",(0,n.yg)("inlineCode",{parentName:"li"},"hertzbeat-xx.tar.gz")," ",(0,n.yg)("a",{parentName:"li",href:"https://hertzbeat.apache.org/docs/download"},"Download Page")),(0,n.yg)("li",{parentName:"ol"},"\u914d\u7f6e HertzBeat \u7684\u914d\u7f6e\u6587\u4ef6 ",(0,n.yg)("inlineCode",{parentName:"li"},"hertzbeat/config/application.yml"),"(\u53ef\u9009)"),(0,n.yg)("li",{parentName:"ol"},"\u90e8\u7f72\u542f\u52a8 ",(0,n.yg)("inlineCode",{parentName:"li"},"$ ./bin/startup.sh ")," \u6216 ",(0,n.yg)("inlineCode",{parentName:"li"},"bin/startup.bat")),(0,n.yg)("li",{parentName:"ol"},"\u6d4f\u89c8\u5668\u8bbf\u95ee ",(0,n.yg)("inlineCode",{parentName:"li"},"http://localhost:1157")," \u5373\u53ef\u5f00\u59cb\uff0c\u9ed8\u8ba4\u8d26\u53f7\u5bc6\u7801 ",(0,n.yg)("inlineCode",{parentName:"li"},"admin/hertzbeat")),(0,n.yg)("li",{parentName:"ol"},"\u90e8\u7f72\u91c7\u96c6\u5668\u96c6\u7fa4(\u53ef\u9009)",(0,n.yg)("ul",{parentName:"li"},(0,n.yg)("li",{parentName:"ul"},"\u4e0b\u8f7d\u60a8\u7cfb\u7edf\u73af\u5883\u5bf9\u5e94\u91c7\u96c6\u5668\u5b89\u88c5\u5305",(0,n.yg)("inlineCode",{parentName:"li"},"hertzbeat-collector-xx.tar.gz"),"\u5230\u89c4\u5212\u7684\u53e6\u4e00\u53f0\u90e8\u7f72\u4e3b\u673a\u4e0a ",(0,n.yg)("a",{parentName:"li",href:"https://hertzbeat.apache.org/docs/download"},"Download Page")),(0,n.yg)("li",{parentName:"ul"},"\u914d\u7f6e\u91c7\u96c6\u5668\u7684\u914d\u7f6e\u6587\u4ef6 ",(0,n.yg)("inlineCode",{parentName:"li"},"hertzbeat-collector/config/application.yml")," \u91cc\u9762\u7684\u8fde\u63a5\u4e3bHertzBeat\u670d\u52a1\u7684\u5bf9\u5916IP\uff0c\u7aef\u53e3\uff0c\u5f53\u524d\u91c7\u96c6\u5668\u540d\u79f0(\u9700\u4fdd\u8bc1\u552f\u4e00\u6027)\u7b49\u53c2\u6570 ",(0,n.yg)("inlineCode",{parentName:"li"},"identity")," ",(0,n.yg)("inlineCode",{parentName:"li"},"mode")," (public or private) ",(0,n.yg)("inlineCode",{parentName:"li"},"manager-host")," ",(0,n.yg)("inlineCode",{parentName:"li"},"manager-port"),(0,n.yg)("pre",{parentName:"li"},(0,n.yg)("code",{parentName:"pre",className:"language-yaml"},"collector:\n  dispatch:\n    entrance:\n      netty:\n        enabled: true\n        identity: ${IDENTITY:}\n        mode: ${MODE:public}\n        manager-host: ${MANAGER_HOST:127.0.0.1}\n        manager-port: ${MANAGER_PORT:1158}\n"))),(0,n.yg)("li",{parentName:"ul"},"\u542f\u52a8 ",(0,n.yg)("inlineCode",{parentName:"li"},"$ ./bin/startup.sh ")," \u6216 ",(0,n.yg)("inlineCode",{parentName:"li"},"bin/startup.bat")),(0,n.yg)("li",{parentName:"ul"},"\u6d4f\u89c8\u5668\u8bbf\u95ee\u4e3bHertzBeat\u670d\u52a1 ",(0,n.yg)("inlineCode",{parentName:"li"},"http://localhost:1157")," \u67e5\u770b\u6982\u89c8\u9875\u9762\u5373\u53ef\u770b\u5230\u6ce8\u518c\u4e0a\u6765\u7684\u65b0\u91c7\u96c6\u5668")))),(0,n.yg)("p",null,"\u66f4\u591a\u914d\u7f6e\u8be6\u7ec6\u6b65\u9aa4\u53c2\u8003 ",(0,n.yg)("a",{parentName:"p",href:"package-deploy"},"\u901a\u8fc7\u5b89\u88c5\u5305\u5b89\u88c5HertzBeat")," "),(0,n.yg)("h4",{id:"\u65b9\u5f0f\u4e09\u672c\u5730\u4ee3\u7801\u542f\u52a8"},"\u65b9\u5f0f\u4e09\uff1a\u672c\u5730\u4ee3\u7801\u542f\u52a8"),(0,n.yg)("ol",null,(0,n.yg)("li",{parentName:"ol"},"\u6b64\u4e3a\u524d\u540e\u7aef\u5206\u79bb\u9879\u76ee\uff0c\u672c\u5730\u4ee3\u7801\u8c03\u8bd5\u9700\u8981\u5206\u522b\u542f\u52a8\u540e\u7aef\u5de5\u7a0b",(0,n.yg)("inlineCode",{parentName:"li"},"manager"),"\u548c\u524d\u7aef\u5de5\u7a0b",(0,n.yg)("inlineCode",{parentName:"li"},"web-app")),(0,n.yg)("li",{parentName:"ol"},"\u540e\u7aef\uff1a\u9700\u8981",(0,n.yg)("inlineCode",{parentName:"li"},"maven3+"),", ",(0,n.yg)("inlineCode",{parentName:"li"},"java17"),"\u548c",(0,n.yg)("inlineCode",{parentName:"li"},"lombok"),"\u73af\u5883\uff0c\u4fee\u6539",(0,n.yg)("inlineCode",{parentName:"li"},"YML"),"\u914d\u7f6e\u4fe1\u606f\u5e76\u542f\u52a8",(0,n.yg)("inlineCode",{parentName:"li"},"manager"),"\u670d\u52a1"),(0,n.yg)("li",{parentName:"ol"},"\u524d\u7aef\uff1a\u9700\u8981",(0,n.yg)("inlineCode",{parentName:"li"},"nodejs npm angular-cli"),"\u73af\u5883\uff0c\u5f85\u672c\u5730\u540e\u7aef\u542f\u52a8\u540e\uff0c\u5728",(0,n.yg)("inlineCode",{parentName:"li"},"web-app"),"\u76ee\u5f55\u4e0b\u542f\u52a8 ",(0,n.yg)("inlineCode",{parentName:"li"},"ng serve --open")),(0,n.yg)("li",{parentName:"ol"},"\u6d4f\u89c8\u5668\u8bbf\u95ee ",(0,n.yg)("inlineCode",{parentName:"li"},"http://localhost:4200")," \u5373\u53ef\u5f00\u59cb\uff0c\u9ed8\u8ba4\u8d26\u53f7\u5bc6\u7801 ",(0,n.yg)("inlineCode",{parentName:"li"},"admin/hertzbeat"))),(0,n.yg)("p",null,"\u8be6\u7ec6\u6b65\u9aa4\u53c2\u8003 ",(0,n.yg)("a",{parentName:"p",href:"../community/contribution"},"\u53c2\u4e0e\u8d21\u732e\u4e4b\u672c\u5730\u4ee3\u7801\u542f\u52a8")),(0,n.yg)("h5",{id:"\u65b9\u5f0f\u56dbdocker-compose-\u7edf\u4e00\u5b89\u88c5-hertzbeatpostgresqltsdb"},"\u65b9\u5f0f\u56db\uff1aDocker-Compose \u7edf\u4e00\u5b89\u88c5 hertzbeat+postgresql+tsdb"),(0,n.yg)("p",null,"\u901a\u8fc7 ",(0,n.yg)("a",{parentName:"p",href:"https://github.com/apache/hertzbeat/tree/master/script/docker-compose"},"docker-compose\u90e8\u7f72\u811a\u672c")," \u4e00\u6b21\u6027\u628a postgresql/mysql \u6570\u636e\u5e93, victoria-metrics/iotdb/tdengine \u65f6\u5e8f\u6570\u636e\u5e93\u548c hertzbeat \u5b89\u88c5\u90e8\u7f72\u3002"),(0,n.yg)("p",null,"\u8be6\u7ec6\u6b65\u9aa4\u53c2\u8003 ",(0,n.yg)("a",{parentName:"p",href:"https://github.com/apache/hertzbeat/tree/master/script/docker-compose/README.md"},"docker-compose\u90e8\u7f72\u65b9\u6848"),"  "),(0,n.yg)("h5",{id:"\u65b9\u5f0f\u4e94kubernetes-helm-charts-\u90e8\u7f72-hertzbeatcollectorpostgresqltsdb"},"\u65b9\u5f0f\u4e94\uff1aKubernetes Helm Charts \u90e8\u7f72 hertzbeat+collector+postgresql+tsdb"),(0,n.yg)("p",null,"\u901a\u8fc7 Helm Chart \u4e00\u6b21\u6027\u5c06 HertzBeat \u96c6\u7fa4\u7ec4\u4ef6\u90e8\u7f72\u5230 Kubernetes \u96c6\u7fa4\u4e2d\u3002"),(0,n.yg)("p",null,"\u8be6\u7ec6\u6b65\u9aa4\u53c2\u8003 ",(0,n.yg)("a",{parentName:"p",href:"https://artifacthub.io/packages/helm/hertzbeat/hertzbeat"},"Artifact Hub")),(0,n.yg)("p",null,(0,n.yg)("strong",{parentName:"p"},"HAVE FUN")))}m.isMDXComponent=!0}}]);