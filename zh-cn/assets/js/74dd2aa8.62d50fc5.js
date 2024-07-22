"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[970],{15680:(t,a,e)=>{e.d(a,{xA:()=>d,yg:()=>N});var n=e(96540);function r(t,a,e){return a in t?Object.defineProperty(t,a,{value:e,enumerable:!0,configurable:!0,writable:!0}):t[a]=e,t}function l(t,a){var e=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);a&&(n=n.filter((function(a){return Object.getOwnPropertyDescriptor(t,a).enumerable}))),e.push.apply(e,n)}return e}function g(t){for(var a=1;a<arguments.length;a++){var e=null!=arguments[a]?arguments[a]:{};a%2?l(Object(e),!0).forEach((function(a){r(t,a,e[a])})):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(e)):l(Object(e)).forEach((function(a){Object.defineProperty(t,a,Object.getOwnPropertyDescriptor(e,a))}))}return t}function y(t,a){if(null==t)return{};var e,n,r=function(t,a){if(null==t)return{};var e,n,r={},l=Object.keys(t);for(n=0;n<l.length;n++)e=l[n],a.indexOf(e)>=0||(r[e]=t[e]);return r}(t,a);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(t);for(n=0;n<l.length;n++)e=l[n],a.indexOf(e)>=0||Object.prototype.propertyIsEnumerable.call(t,e)&&(r[e]=t[e])}return r}var m=n.createContext({}),p=function(t){var a=n.useContext(m),e=a;return t&&(e="function"==typeof t?t(a):g(g({},a),t)),e},d=function(t){var a=p(t.components);return n.createElement(m.Provider,{value:a},t.children)},i={inlineCode:"code",wrapper:function(t){var a=t.children;return n.createElement(n.Fragment,{},a)}},u=n.forwardRef((function(t,a){var e=t.components,r=t.mdxType,l=t.originalType,m=t.parentName,d=y(t,["components","mdxType","originalType","parentName"]),u=p(e),N=r,o=u["".concat(m,".").concat(N)]||u[N]||i[N]||l;return e?n.createElement(o,g(g({ref:a},d),{},{components:e})):n.createElement(o,g({ref:a},d))}));function N(t,a){var e=arguments,r=a&&a.mdxType;if("string"==typeof t||r){var l=e.length,g=new Array(l);g[0]=u;var y={};for(var m in a)hasOwnProperty.call(a,m)&&(y[m]=a[m]);y.originalType=t,y.mdxType="string"==typeof t?t:r,g[1]=y;for(var p=2;p<l;p++)g[p]=e[p];return n.createElement.apply(null,g)}return n.createElement.apply(null,e)}u.displayName="MDXCreateElement"},32953:(t,a,e)=>{e.r(a),e.d(a,{assets:()=>m,contentTitle:()=>g,default:()=>i,frontMatter:()=>l,metadata:()=>y,toc:()=>p});var n=e(58168),r=(e(96540),e(15680));const l={id:"flink_on_yarn",title:"\u76d1\u63a7\uff1aFlink On Yarn",sidebar_label:"Flink On Yarn Monitor",keywords:["\u5f00\u6e90\u76d1\u63a7\u7cfb\u7edf","\u5f00\u6e90 Flink On Yarn \u76d1\u63a7"]},g=void 0,y={unversionedId:"help/flink_on_yarn",id:"help/flink_on_yarn",title:"\u76d1\u63a7\uff1aFlink On Yarn",description:"\u5bf9Yarn\u8fd0\u884c\u6a21\u5f0f\u4e0b\u7684Flink\u6d41\u5f15\u64ce\u7684\u901a\u7528\u6307\u6807\u8fdb\u884c\u6d4b\u91cf\u76d1\u63a7\u3002",source:"@site/i18n/zh-cn/docusaurus-plugin-content-docs/current/help/flink_on_yarn.md",sourceDirName:"help",slug:"/help/flink_on_yarn",permalink:"/zh-cn/docs/help/flink_on_yarn",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/i18n/zh-cn/docusaurus-plugin-content-docs/current/help/flink_on_yarn.md",tags:[],version:"current",frontMatter:{id:"flink_on_yarn",title:"\u76d1\u63a7\uff1aFlink On Yarn",sidebar_label:"Flink On Yarn Monitor",keywords:["\u5f00\u6e90\u76d1\u63a7\u7cfb\u7edf","\u5f00\u6e90 Flink On Yarn \u76d1\u63a7"]},sidebar:"docs",previous:{title:"Flink Monitor",permalink:"/zh-cn/docs/help/flink"},next:{title:"DORIS\u6570\u636e\u5e93BE",permalink:"/zh-cn/docs/help/doris_be"}},m={},p=[{value:"\u914d\u7f6e\u53c2\u6570",id:"\u914d\u7f6e\u53c2\u6570",level:3},{value:"\u91c7\u96c6\u6307\u6807",id:"\u91c7\u96c6\u6307\u6807",level:3},{value:"\u6307\u6807\u96c6\u5408\uff1aJobManager Metrics",id:"\u6307\u6807\u96c6\u5408jobmanager-metrics",level:4},{value:"\u6307\u6807\u96c6\u5408\uff1aJobManager Config",id:"\u6307\u6807\u96c6\u5408jobmanager-config",level:4},{value:"TaskManager",id:"taskmanager",level:4},{value:"TaskManager Metrics",id:"taskmanager-metrics",level:4}],d={toc:p};function i(t){let{components:a,...e}=t;return(0,r.yg)("wrapper",(0,n.A)({},d,e,{components:a,mdxType:"MDXLayout"}),(0,r.yg)("blockquote",null,(0,r.yg)("p",{parentName:"blockquote"},"\u5bf9Yarn\u8fd0\u884c\u6a21\u5f0f\u4e0b\u7684Flink\u6d41\u5f15\u64ce\u7684\u901a\u7528\u6307\u6807\u8fdb\u884c\u6d4b\u91cf\u76d1\u63a7\u3002\n\u76d1\u63a7\u6307\u6807\u5bf9\u5e94\u7684\u4e2d\u6587\u542b\u4e49\u5728\u672c\u8bf4\u660e\u6587\u6863\u63cf\u8ff0\uff0c\u9875\u9762\u76d1\u63a7\u663e\u793a\u7684\u6307\u6807\u5747\u4e3aFlink\u539f\u751f\u6307\u6807\u6ca1\u6709\u7ffb\u8bd1\u6210\u4e2d\u6587\uff0c\u6015\u5f15\u53d1\u6b67\u4e49\u3002")),(0,r.yg)("h3",{id:"\u914d\u7f6e\u53c2\u6570"},"\u914d\u7f6e\u53c2\u6570"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"\u53c2\u6570\u540d\u79f0"),(0,r.yg)("th",{parentName:"tr",align:null},"\u53c2\u6570\u5e2e\u52a9\u63cf\u8ff0"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"\u76d1\u63a7Host"),(0,r.yg)("td",{parentName:"tr",align:null},"\u88ab\u76d1\u63a7\u7684\u5bf9\u7aefIPV4\uff0cIPV6\u6216\u57df\u540d\u3002\u6ce8\u610f\u26a0\ufe0f\u4e0d\u5e26\u534f\u8bae\u5934(eg: https://, http://)\u3002")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"\u4efb\u52a1\u540d\u79f0"),(0,r.yg)("td",{parentName:"tr",align:null},"\u6807\u8bc6\u6b64\u76d1\u63a7\u7684\u540d\u79f0\uff0c\u540d\u79f0\u9700\u8981\u4fdd\u8bc1\u552f\u4e00\u6027\u3002")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Yarn\u7aef\u53e3"),(0,r.yg)("td",{parentName:"tr",align:null},"Yarn\u7684\u7aef\u53e3\uff0c\u5bf9\u5e94\u914d\u7f6e\u9879:",(0,r.yg)("inlineCode",{parentName:"td"},"yarn.resourcemanager.webapp.address"),"\u4e2d\u7684\u7aef\u53e3")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"\u67e5\u8be2\u8d85\u65f6\u65f6\u95f4"),(0,r.yg)("td",{parentName:"tr",align:null},"\u8bbe\u7f6eJVM\u8fde\u63a5\u7684\u8d85\u65f6\u65f6\u95f4\uff0c\u5355\u4f4dms\u6beb\u79d2\uff0c\u9ed8\u8ba43000\u6beb\u79d2\u3002")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"\u542f\u52a8SSL"),(0,r.yg)("td",{parentName:"tr",align:null},"\u662f\u5426\u542f\u7528SSL")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"\u7528\u6237\u540d"),(0,r.yg)("td",{parentName:"tr",align:null},"\u8fde\u63a5\u7528\u6237\u540d")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"\u5bc6\u7801"),(0,r.yg)("td",{parentName:"tr",align:null},"\u8fde\u63a5\u5bc6\u7801")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"\u76d1\u63a7\u5468\u671f"),(0,r.yg)("td",{parentName:"tr",align:null},"\u76d1\u63a7\u5468\u671f\u6027\u91c7\u96c6\u6570\u636e\u95f4\u9694\u65f6\u95f4\uff0c\u5355\u4f4d\u79d2\uff0c\u53ef\u8bbe\u7f6e\u7684\u6700\u5c0f\u95f4\u9694\u4e3a30\u79d2")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"\u7ed1\u5b9a\u6807\u7b7e"),(0,r.yg)("td",{parentName:"tr",align:null},"\u7528\u4e8e\u5bf9\u76d1\u63a7\u8d44\u6e90\u8fdb\u884c\u5206\u7c7b\u7ba1\u7406\u3002")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"\u63cf\u8ff0\u5907\u6ce8"),(0,r.yg)("td",{parentName:"tr",align:null},"\u66f4\u591a\u6807\u8bc6\u548c\u63cf\u8ff0\u6b64\u76d1\u63a7\u7684\u5907\u6ce8\u4fe1\u606f\uff0c\u7528\u6237\u53ef\u4ee5\u5728\u8fd9\u91cc\u5907\u6ce8\u4fe1\u606f\u3002")))),(0,r.yg)("h3",{id:"\u91c7\u96c6\u6307\u6807"},"\u91c7\u96c6\u6307\u6807"),(0,r.yg)("h4",{id:"\u6307\u6807\u96c6\u5408jobmanager-metrics"},"\u6307\u6807\u96c6\u5408\uff1aJobManager Metrics"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"\u6307\u6807\u540d\u79f0"),(0,r.yg)("th",{parentName:"tr",align:null},"\u6307\u6807\u5355\u4f4d"),(0,r.yg)("th",{parentName:"tr",align:null},"\u6307\u6807\u5e2e\u52a9\u63cf\u8ff0"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.Memory.NonHeap.Committed"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"\u975e\u5806\u5185\u5b58\u7684\u63d0\u4ea4\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.Memory.Mapped.TotalCapacity"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"\u6620\u5c04\u5185\u5b58\u7684\u603b\u5bb9\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.Memory.NonHeap.Used"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"\u975e\u5806\u5185\u5b58\u7684\u4f7f\u7528\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.Memory.Metaspace.Max"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5143\u7a7a\u95f4\u7684\u6700\u5927\u5bb9\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.GarbageCollector.G1_Old_Generation.Count"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"\u8001\u5e74\u4ee3\u5783\u573e\u6536\u96c6\u6b21\u6570")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.Memory.Direct.MemoryUsed"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"\u76f4\u63a5\u5185\u5b58\u7684\u4f7f\u7528\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.Memory.Mapped.MemoryUsed"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"\u6620\u5c04\u5185\u5b58\u7684\u4f7f\u7528\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.GarbageCollector.G1_Young_Generation.Count"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5e74\u8f7b\u4ee3\u5783\u573e\u6536\u96c6\u6b21\u6570")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.Memory.Direct.TotalCapacity"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"\u76f4\u63a5\u5185\u5b58\u7684\u603b\u5bb9\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.GarbageCollector.G1_Old_Generation.Time"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"\u8001\u5e74\u4ee3\u5783\u573e\u6536\u96c6\u65f6\u95f4")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.Memory.Heap.Committed"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5806\u5185\u5b58\u7684\u63d0\u4ea4\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.Memory.Mapped.Count"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"\u6620\u5c04\u5185\u5b58\u7684\u6570\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.Memory.Metaspace.Used"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5143\u7a7a\u95f4\u7684\u4f7f\u7528\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.Memory.Direct.Count"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"\u76f4\u63a5\u5185\u5b58\u7684\u6570\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.Memory.Heap.Used"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5806\u5185\u5b58\u7684\u4f7f\u7528\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.Memory.Heap.Max"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5806\u5185\u5b58\u7684\u6700\u5927\u5bb9\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.GarbageCollector.G1_Young_Generation.Time"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5e74\u8f7b\u4ee3\u5783\u573e\u6536\u96c6\u65f6\u95f4")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.Memory.NonHeap.Max"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"\u975e\u5806\u5185\u5b58\u7684\u6700\u5927\u5bb9\u91cf")))),(0,r.yg)("h4",{id:"\u6307\u6807\u96c6\u5408jobmanager-config"},"\u6307\u6807\u96c6\u5408\uff1aJobManager Config"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"\u6307\u6807\u540d\u79f0"),(0,r.yg)("th",{parentName:"tr",align:null},"\u6307\u6807\u5355\u4f4d"),(0,r.yg)("th",{parentName:"tr",align:null},"\u6307\u6807\u5e2e\u52a9\u63cf\u8ff0"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"internal.jobgraph-path"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5185\u90e8\u4f5c\u4e1a\u56fe\u8def\u5f84")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"env.java.home"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"Java \u73af\u5883\u8def\u5f84")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"classloader.check-leaked-classloader"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"\u662f\u5426\u68c0\u67e5\u7c7b\u52a0\u8f7d\u5668")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"env.java.opts"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"Java \u9009\u9879")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"high-availability.cluster-id"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"\u9ad8\u53ef\u7528\u6027\u96c6\u7fa4 ID")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"jobmanager.rpc.address"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"JobManager \u7684 RPC \u5730\u5740")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"jobmanager.memory.jvm-overhead.min"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"JobManager \u7684 JVM \u5f00\u9500\u6700\u5c0f\u503c")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"jobmanager.web.port"),(0,r.yg)("td",{parentName:"tr",align:null},"\u7aef\u53e3\u53f7"),(0,r.yg)("td",{parentName:"tr",align:null},"JobManager \u7684 Web \u7aef\u53e3")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"webclient.port"),(0,r.yg)("td",{parentName:"tr",align:null},"\u7aef\u53e3\u53f7"),(0,r.yg)("td",{parentName:"tr",align:null},"Web \u5ba2\u6237\u7aef\u7aef\u53e3")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"execution.savepoint.ignore-unclaimed-state"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"\u662f\u5426\u5ffd\u7565\u672a\u58f0\u660e\u7684\u72b6\u6001")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"io.tmp.dirs"),(0,r.yg)("td",{parentName:"tr",align:null},"\u8def\u5f84"),(0,r.yg)("td",{parentName:"tr",align:null},"\u4e34\u65f6\u6587\u4ef6\u76ee\u5f55")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"parallelism.default"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"\u9ed8\u8ba4\u5e76\u884c\u5ea6")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"taskmanager.memory.fraction"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"TaskManager \u5185\u5b58\u5360\u6bd4")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"taskmanager.numberOfTaskSlots"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"TaskManager \u7684\u4efb\u52a1\u69fd\u6570\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"yarn.application.name"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"Yarn \u5e94\u7528\u540d\u79f0")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"taskmanager.heap.mb"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"TaskManager \u5806\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"taskmanager.memory.process.size"),(0,r.yg)("td",{parentName:"tr",align:null},"GB"),(0,r.yg)("td",{parentName:"tr",align:null},"TaskManager \u8fdb\u7a0b\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"web.port"),(0,r.yg)("td",{parentName:"tr",align:null},"\u7aef\u53e3\u53f7"),(0,r.yg)("td",{parentName:"tr",align:null},"Web \u7aef\u53e3")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"classloader.resolve-order"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"\u7c7b\u52a0\u8f7d\u5668\u89e3\u6790\u987a\u5e8f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"jobmanager.heap.mb"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"JobManager \u5806\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"jobmanager.memory.off-heap.size"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"JobManager \u5806\u5916\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"state.backend.incremental"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"\u72b6\u6001\u540e\u7aef\u662f\u5426\u589e\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"execution.target"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"\u6267\u884c\u76ee\u6807")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"jobmanager.memory.process.size"),(0,r.yg)("td",{parentName:"tr",align:null},"GB"),(0,r.yg)("td",{parentName:"tr",align:null},"JobManager \u8fdb\u7a0b\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"web.tmpdir"),(0,r.yg)("td",{parentName:"tr",align:null},"\u8def\u5f84"),(0,r.yg)("td",{parentName:"tr",align:null},"Web \u4e34\u65f6\u76ee\u5f55")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"yarn.ship-files"),(0,r.yg)("td",{parentName:"tr",align:null},"\u8def\u5f84"),(0,r.yg)("td",{parentName:"tr",align:null},"Yarn \u4f20\u8f93\u6587\u4ef6")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"jobmanager.rpc.port"),(0,r.yg)("td",{parentName:"tr",align:null},"\u7aef\u53e3\u53f7"),(0,r.yg)("td",{parentName:"tr",align:null},"JobManager \u7684 RPC \u7aef\u53e3")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"internal.io.tmpdirs.use-local-default"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"\u662f\u5426\u4f7f\u7528\u672c\u5730\u9ed8\u8ba4\u4e34\u65f6\u76ee\u5f55")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"execution.checkpointing.interval"),(0,r.yg)("td",{parentName:"tr",align:null},"\u6beb\u79d2"),(0,r.yg)("td",{parentName:"tr",align:null},"\u68c0\u67e5\u70b9\u95f4\u9694")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"execution.attached"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"\u662f\u5426\u9644\u52a0\u6267\u884c")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"internal.cluster.execution-mode"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5185\u90e8\u96c6\u7fa4\u6267\u884c\u6a21\u5f0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"execution.shutdown-on-attached-exit"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"\u662f\u5426\u5728\u9644\u52a0\u9000\u51fa\u65f6\u5173\u95ed")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"pipeline.jars"),(0,r.yg)("td",{parentName:"tr",align:null},"\u8def\u5f84"),(0,r.yg)("td",{parentName:"tr",align:null},"\u7ba1\u9053 JAR \u6587\u4ef6")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"rest.address"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"REST \u5730\u5740")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"state.backend"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"\u72b6\u6001\u540e\u7aef\u7c7b\u578b")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"jobmanager.memory.jvm-metaspace.size"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"JobManager JVM \u5143\u7a7a\u95f4\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"$internal.deployment.config-dir"),(0,r.yg)("td",{parentName:"tr",align:null},"\u8def\u5f84"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5185\u90e8\u90e8\u7f72\u914d\u7f6e\u76ee\u5f55")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"$internal.yarn.log-config-file"),(0,r.yg)("td",{parentName:"tr",align:null},"\u8def\u5f84"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5185\u90e8 Yarn \u65e5\u5fd7\u914d\u7f6e\u6587\u4ef6\u8def\u5f84")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"jobmanager.memory.heap.size"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"JobManager \u5806\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"state.checkpoints.dir"),(0,r.yg)("td",{parentName:"tr",align:null},"\u8def\u5f84"),(0,r.yg)("td",{parentName:"tr",align:null},"\u72b6\u6001\u68c0\u67e5\u70b9\u76ee\u5f55")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"jobmanager.memory.jvm-overhead.max"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5b57\u8282"),(0,r.yg)("td",{parentName:"tr",align:null},"JobManager \u7684 JVM \u5f00\u9500\u6700\u5927\u503c")))),(0,r.yg)("h4",{id:"taskmanager"},"TaskManager"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"\u6307\u6807\u540d\u79f0"),(0,r.yg)("th",{parentName:"tr",align:null},"\u6307\u6807\u5355\u4f4d"),(0,r.yg)("th",{parentName:"tr",align:null},"\u6307\u6807\u5e2e\u52a9\u63cf\u8ff0"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Container ID"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5bb9\u5668 ID\uff0c\u7528\u4e8e\u552f\u4e00\u6807\u8bc6\u4e00\u4e2a\u5bb9\u5668")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Path"),(0,r.yg)("td",{parentName:"tr",align:null},"-"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5bb9\u5668\u8def\u5f84")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Data Port"),(0,r.yg)("td",{parentName:"tr",align:null},"\u7aef\u53e3\u53f7"),(0,r.yg)("td",{parentName:"tr",align:null},"\u6570\u636e\u4f20\u8f93\u7aef\u53e3")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"JMX Port"),(0,r.yg)("td",{parentName:"tr",align:null},"\u7aef\u53e3\u53f7"),(0,r.yg)("td",{parentName:"tr",align:null},"JMX\uff08Java Management Extensions\uff09\u7aef\u53e3")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Last Heartbeat"),(0,r.yg)("td",{parentName:"tr",align:null},"\u65f6\u95f4\u6233"),(0,r.yg)("td",{parentName:"tr",align:null},"\u6700\u540e\u4e00\u6b21\u5fc3\u8df3\u65f6\u95f4")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"All Slots"),(0,r.yg)("td",{parentName:"tr",align:null},"\u6570\u91cf"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5bb9\u5668\u4e2d\u6240\u6709\u4efb\u52a1\u69fd\u7684\u6570\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Free Slots"),(0,r.yg)("td",{parentName:"tr",align:null},"\u6570\u91cf"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5bb9\u5668\u4e2d\u7a7a\u95f2\u4efb\u52a1\u69fd\u7684\u6570\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"totalResourceCpuCores"),(0,r.yg)("td",{parentName:"tr",align:null},"\u6838\u5fc3\u6570"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5bb9\u5668\u603b\u7684CPU\u6838\u5fc3\u6570")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"totalResourceTaskHeapMemory"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5bb9\u5668\u603b\u7684\u4efb\u52a1\u5806\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"totalResourceManagedMemory"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5bb9\u5668\u603b\u7684\u6258\u7ba1\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"totalResourceNetworkMemory"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5bb9\u5668\u603b\u7684\u7f51\u7edc\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"freeResourceCpuCores"),(0,r.yg)("td",{parentName:"tr",align:null},"\u6838\u5fc3\u6570"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5bb9\u5668\u4e2d\u7a7a\u95f2\u7684CPU\u6838\u5fc3\u6570")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"freeResourceTaskHeapMemory"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5bb9\u5668\u4e2d\u7a7a\u95f2\u7684\u4efb\u52a1\u5806\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"freeResourceTaskOffHeapMemory"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5bb9\u5668\u4e2d\u7a7a\u95f2\u7684\u4efb\u52a1\u5806\u5916\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"freeResourceManagedMemory"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5bb9\u5668\u4e2d\u7a7a\u95f2\u7684\u6258\u7ba1\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"freeResourceNetworkMemory"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"\u5bb9\u5668\u4e2d\u7a7a\u95f2\u7684\u7f51\u7edc\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"CPU Cores"),(0,r.yg)("td",{parentName:"tr",align:null},"\u6838\u5fc3\u6570"),(0,r.yg)("td",{parentName:"tr",align:null},"CPU\u6838\u5fc3\u6570")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Physical MEM"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"\u7269\u7406\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"JVM Heap Size"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"JVM\u5806\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Flink Managed MEM"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"Flink\u7ba1\u7406\u7684\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Framework Heap"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"\u6846\u67b6\u5806\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Task Heap"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"\u4efb\u52a1\u5806\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Framework Off-Heap"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"\u6846\u67b6\u5806\u5916\u5185\u5b58\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"memoryConfigurationTaskOffHeap"),(0,r.yg)("td",{parentName:"tr",align:null},"Byte"),(0,r.yg)("td",{parentName:"tr",align:null},"\u4efb\u52a1\u5806\u5916\u5185\u5b58\u914d\u7f6e")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Network"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"\u7f51\u7edc\u5185\u5b58\u914d\u7f6e")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Managed Memory"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"\u6258\u7ba1\u5185\u5b58\u914d\u7f6e")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"JVM Metaspace"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"JVM\u5143\u7a7a\u95f4\u5927\u5c0f")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"JVM Overhead"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"JVM\u5f00\u9500")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"memoryConfigurationTotalFlinkMemory"),(0,r.yg)("td",{parentName:"tr",align:null},"Byte"),(0,r.yg)("td",{parentName:"tr",align:null},"Flink\u603b\u5185\u5b58\u914d\u7f6e")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"memoryConfigurationTotalProcessMemory"),(0,r.yg)("td",{parentName:"tr",align:null},"Byte"),(0,r.yg)("td",{parentName:"tr",align:null},"\u8fdb\u7a0b\u603b\u5185\u5b58\u914d\u7f6e")))),(0,r.yg)("h4",{id:"taskmanager-metrics"},"TaskManager Metrics"),(0,r.yg)("table",null,(0,r.yg)("thead",{parentName:"table"},(0,r.yg)("tr",{parentName:"thead"},(0,r.yg)("th",{parentName:"tr",align:null},"\u6307\u6807\u540d\u79f0"),(0,r.yg)("th",{parentName:"tr",align:null},"\u6307\u6807\u5355\u4f4d"),(0,r.yg)("th",{parentName:"tr",align:null},"\u6307\u6807\u5e2e\u52a9\u63cf\u8ff0"))),(0,r.yg)("tbody",{parentName:"table"},(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.Shuffle.Netty.TotalMemory"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"Netty Shuffle \u4f7f\u7528\u7684\u603b\u5185\u5b58")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.Flink.Memory.Managed.Used"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"Flink \u7ba1\u7406\u7684\u5df2\u7528\u5185\u5b58")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.Memory.Metaspace.Used"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"JVM \u5143\u7a7a\u95f4\u5df2\u4f7f\u7528\u7684\u5185\u5b58")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.Memory.Metaspace.Max"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"JVM \u5143\u7a7a\u95f4\u7684\u6700\u5927\u5185\u5b58")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.Memory.Heap.Used"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"JVM \u5806\u5185\u5b58\u5df2\u4f7f\u7528\u7684\u5185\u5b58")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.JVM.Memory.Heap.Max"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"JVM \u5806\u5185\u5b58\u7684\u6700\u5927\u5bb9\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.Flink.Memory.Managed.Total"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"Flink \u7ba1\u7406\u7684\u5185\u5b58\u603b\u91cf")),(0,r.yg)("tr",{parentName:"tbody"},(0,r.yg)("td",{parentName:"tr",align:null},"Status.Shuffle.Netty.UsedMemory"),(0,r.yg)("td",{parentName:"tr",align:null},"MB"),(0,r.yg)("td",{parentName:"tr",align:null},"Netty Shuffle \u4f7f\u7528\u7684\u5185\u5b58")))))}i.isMDXComponent=!0}}]);