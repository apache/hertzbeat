"use strict";(self.webpackChunkhertzbeat=self.webpackChunkhertzbeat||[]).push([[55790],{15680:(e,t,a)=>{a.d(t,{xA:()=>g,yg:()=>s});var r=a(96540);function n(e,t,a){return t in e?Object.defineProperty(e,t,{value:a,enumerable:!0,configurable:!0,writable:!0}):e[t]=a,e}function l(e,t){var a=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),a.push.apply(a,r)}return a}function i(e){for(var t=1;t<arguments.length;t++){var a=null!=arguments[t]?arguments[t]:{};t%2?l(Object(a),!0).forEach((function(t){n(e,t,a[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(a)):l(Object(a)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(a,t))}))}return e}function p(e,t){if(null==e)return{};var a,r,n=function(e,t){if(null==e)return{};var a,r,n={},l=Object.keys(e);for(r=0;r<l.length;r++)a=l[r],t.indexOf(a)>=0||(n[a]=e[a]);return n}(e,t);if(Object.getOwnPropertySymbols){var l=Object.getOwnPropertySymbols(e);for(r=0;r<l.length;r++)a=l[r],t.indexOf(a)>=0||Object.prototype.propertyIsEnumerable.call(e,a)&&(n[a]=e[a])}return n}var o=r.createContext({}),m=function(e){var t=r.useContext(o),a=t;return e&&(a="function"==typeof e?e(t):i(i({},t),e)),a},g=function(e){var t=m(e.components);return r.createElement(o.Provider,{value:t},e.children)},y={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},u=r.forwardRef((function(e,t){var a=e.components,n=e.mdxType,l=e.originalType,o=e.parentName,g=p(e,["components","mdxType","originalType","parentName"]),u=m(a),s=n,c=u["".concat(o,".").concat(s)]||u[s]||y[s]||l;return a?r.createElement(c,i(i({ref:t},g),{},{components:a})):r.createElement(c,i({ref:t},g))}));function s(e,t){var a=arguments,n=t&&t.mdxType;if("string"==typeof e||n){var l=a.length,i=new Array(l);i[0]=u;var p={};for(var o in t)hasOwnProperty.call(t,o)&&(p[o]=t[o]);p.originalType=e,p.mdxType="string"==typeof e?e:n,i[1]=p;for(var m=2;m<l;m++)i[m]=a[m];return r.createElement.apply(null,i)}return r.createElement.apply(null,a)}u.displayName="MDXCreateElement"},72025:(e,t,a)=>{a.r(t),a.d(t,{assets:()=>o,contentTitle:()=>i,default:()=>y,frontMatter:()=>l,metadata:()=>p,toc:()=>m});var r=a(58168),n=(a(96540),a(15680));const l={id:"contribution",title:"\u8d21\u732e\u6307\u5357",sidebar_position:0},i=void 0,p={unversionedId:"community/contribution",id:"version-v1.6.x/community/contribution",title:"\u8d21\u732e\u6307\u5357",description:"\x3c!--",source:"@site/i18n/zh-cn/docusaurus-plugin-content-docs/version-v1.6.x/community/contribution.md",sourceDirName:"community",slug:"/community/contribution",permalink:"/zh-cn/docs/v1.6.x/community/contribution",draft:!1,editUrl:"https://github.com/apache/hertzbeat/edit/master/home/i18n/zh-cn/docusaurus-plugin-content-docs/version-v1.6.x/community/contribution.md",tags:[],version:"v1.6.x",sidebarPosition:0,frontMatter:{id:"contribution",title:"\u8d21\u732e\u6307\u5357",sidebar_position:0},sidebar:"docs",previous:{title:"\u8fd0\u884c\u7f16\u8bd1",permalink:"/zh-cn/docs/v1.6.x/community/development"},next:{title:"\u90ae\u4ef6\u5217\u8868",permalink:"/zh-cn/docs/v1.6.x/community/mailing_lists"}},o={},m=[{value:"\u8d21\u732e\u65b9\u5f0f",id:"\u8d21\u732e\u65b9\u5f0f",level:3},{value:"\u8ba9 HertzBeat \u8fd0\u884c\u8d77\u6765",id:"\u8ba9-hertzbeat-\u8fd0\u884c\u8d77\u6765",level:3},{value:"\u540e\u7aef\u542f\u52a8",id:"\u540e\u7aef\u542f\u52a8",level:4},{value:"\u524d\u7aef\u542f\u52a8",id:"\u524d\u7aef\u542f\u52a8",level:4},{value:"\u5bfb\u627e\u4efb\u52a1",id:"\u5bfb\u627e\u4efb\u52a1",level:3},{value:"\u63d0\u4ea4 Pull Request",id:"\u63d0\u4ea4-pull-request",level:3},{value:"\u7b49\u5f85PR\u4ee3\u7801\u88ab\u5408\u5e76",id:"\u7b49\u5f85pr\u4ee3\u7801\u88ab\u5408\u5e76",level:3},{value:"\u4ee3\u7801\u88ab\u5408\u5e76\u540e",id:"\u4ee3\u7801\u88ab\u5408\u5e76\u540e",level:3},{value:"\u5982\u4f55\u6210\u4e3a Committer\uff1f",id:"\u5982\u4f55\u6210\u4e3a-committer",level:3},{value:"\u52a0\u5165\u8ba8\u8bba\u4ea4\u6d41",id:"\u52a0\u5165\u8ba8\u8bba\u4ea4\u6d41",level:3},{value:"\u6a21\u5757",id:"\u6a21\u5757",level:3}],g={toc:m};function y(e){let{components:t,...l}=e;return(0,n.yg)("wrapper",(0,r.A)({},g,l,{components:t,mdxType:"MDXLayout"}),(0,n.yg)("blockquote",null,(0,n.yg)("p",{parentName:"blockquote"},"\u975e\u5e38\u6b22\u8fce\u53c2\u4e0e\u9879\u76ee\u8d21\u732e\uff0c\u6211\u4eec\u81f4\u529b\u4e8e\u7ef4\u62a4\u4e00\u4e2a\u4e92\u76f8\u5e2e\u52a9\u7684\u5feb\u4e50\u793e\u533a\u3002")),(0,n.yg)("h3",{id:"\u8d21\u732e\u65b9\u5f0f"},"\u8d21\u732e\u65b9\u5f0f"),(0,n.yg)("blockquote",null,(0,n.yg)("p",{parentName:"blockquote"},"\u5728 HertzBeat \u793e\u533a\uff0c\u8d21\u732e\u65b9\u5f0f\u6709\u5f88\u591a:")),(0,n.yg)("ul",null,(0,n.yg)("li",{parentName:"ul"},(0,n.yg)("p",{parentName:"li"},"\ud83d\udcbb",(0,n.yg)("strong",{parentName:"p"},"\u4ee3\u7801"),"\uff1a\u53ef\u4ee5\u5e2e\u52a9\u793e\u533a\u5b8c\u6210\u4e00\u4e9b\u4efb\u52a1\u3001\u7f16\u5199\u65b0\u7684 feature \u6216\u8005\u662f\u4fee\u590d\u4e00\u4e9b bug\uff1b")),(0,n.yg)("li",{parentName:"ul"},(0,n.yg)("p",{parentName:"li"},"\u26a0\ufe0f",(0,n.yg)("strong",{parentName:"p"},"\u6d4b\u8bd5"),"\uff1a\u53ef\u4ee5\u6765\u53c2\u4e0e\u6d4b\u8bd5\u4ee3\u7801\u7684\u7f16\u5199\uff0c\u5305\u62ec\u4e86\u5355\u5143\u6d4b\u8bd5\u3001\u96c6\u6210\u6d4b\u8bd5\u3001e2e \u6d4b\u8bd5\uff1b")),(0,n.yg)("li",{parentName:"ul"},(0,n.yg)("p",{parentName:"li"},"\ud83d\udcd6",(0,n.yg)("strong",{parentName:"p"},"\u6587\u6863"),"\uff1a\u53ef\u4ee5\u7f16\u5199\u6216\u5b8c\u5584\u6587\u6863\uff0c\u6765\u5e2e\u52a9\u7528\u6237\u66f4\u597d\u5730\u4e86\u89e3\u548c\u4f7f\u7528 HertzBeat\uff1b")),(0,n.yg)("li",{parentName:"ul"},(0,n.yg)("p",{parentName:"li"},"\ud83d\udcdd",(0,n.yg)("strong",{parentName:"p"},"\u535a\u5ba2"),"\uff1a\u53ef\u4ee5\u64b0\u5199 HertzBeat \u7684\u76f8\u5173\u6587\u7ae0\uff0c\u6765\u5e2e\u52a9\u793e\u533a\u66f4\u597d\u5730\u63a8\u5e7f\uff1b")),(0,n.yg)("li",{parentName:"ul"},(0,n.yg)("p",{parentName:"li"},"\ud83e\udd14",(0,n.yg)("strong",{parentName:"p"},"\u8ba8\u8bba"),"\uff1a\u53ef\u4ee5\u53c2\u4e0e HertzBeat \u65b0\u7684 feature \u7684\u8ba8\u8bba\uff0c\u5c06\u60a8\u7684\u60f3\u6cd5\u8ddf HertzBeat \u878d\u5408\uff1b")),(0,n.yg)("li",{parentName:"ul"},(0,n.yg)("p",{parentName:"li"},"\ud83d\udca1",(0,n.yg)("strong",{parentName:"p"},"\u5e03\u9053"),"\uff1a\u53ef\u4ee5\u5e2e\u52a9\u5ba3\u4f20\u6216\u63a8\u5e7f HertzBeat \u793e\u533a\uff0c\u5728 meetup \u6216 summit \u4e2d\u6f14\u8bb2\uff1b")),(0,n.yg)("li",{parentName:"ul"},(0,n.yg)("p",{parentName:"li"},"\ud83d\udcac",(0,n.yg)("strong",{parentName:"p"},"\u5efa\u8bae"),"\uff1a\u4e5f\u53ef\u4ee5\u5bf9\u9879\u76ee\u6216\u8005\u793e\u533a\u63d0\u51fa\u4e00\u4e9b\u5efa\u8bae\uff0c\u4fc3\u8fdb\u793e\u533a\u7684\u826f\u6027\u53d1\u5c55\uff1b"))),(0,n.yg)("p",null,"\u66f4\u591a\u8d21\u732e\u65b9\u5f0f\u53c2\u89c1 ",(0,n.yg)("a",{parentName:"p",href:"https://allcontributors.org/docs/en/emoji-key"},"Contribution Types")),(0,n.yg)("p",null,"\u5373\u4fbf\u662f\u5c0f\u5230\u9519\u522b\u5b57\u7684\u4fee\u6b63\u6211\u4eec\u4e5f\u90fd\u975e\u5e38\u6b22\u8fce :)"),(0,n.yg)("h3",{id:"\u8ba9-hertzbeat-\u8fd0\u884c\u8d77\u6765"},"\u8ba9 HertzBeat \u8fd0\u884c\u8d77\u6765"),(0,n.yg)("blockquote",null,(0,n.yg)("p",{parentName:"blockquote"},"\u8ba9 HertzBeat \u7684\u4ee3\u7801\u5728\u60a8\u7684\u5f00\u53d1\u5de5\u5177\u4e0a\u8fd0\u884c\u8d77\u6765\uff0c\u5e76\u4e14\u80fd\u591f\u65ad\u70b9\u8c03\u8bd5\u3002\n\u6b64\u4e3a\u524d\u540e\u7aef\u5206\u79bb\u9879\u76ee\uff0c\u672c\u5730\u4ee3\u7801\u542f\u52a8\u9700\u5c06\u540e\u7aef ",(0,n.yg)("a",{parentName:"p",href:"https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager"},"manager")," \u548c\u524d\u7aef ",(0,n.yg)("a",{parentName:"p",href:"https://github.com/apache/hertzbeat/tree/master/web-app"},"web-app")," \u5206\u522b\u542f\u52a8\u751f\u6548\u3002")),(0,n.yg)("h4",{id:"\u540e\u7aef\u542f\u52a8"},"\u540e\u7aef\u542f\u52a8"),(0,n.yg)("ol",null,(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u9700\u8981 ",(0,n.yg)("inlineCode",{parentName:"p"},"maven3+"),", ",(0,n.yg)("inlineCode",{parentName:"p"},"java17")," \u548c ",(0,n.yg)("inlineCode",{parentName:"p"},"lombok")," \u73af\u5883")),(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"(\u53ef\u9009)\u4fee\u6539\u914d\u7f6e\u6587\u4ef6\u914d\u7f6e\u4fe1\u606f-",(0,n.yg)("inlineCode",{parentName:"p"},"manager/src/main/resources/application.yml"))),(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u5728\u9879\u76ee\u6839\u76ee\u5f55\u8fd0\u884c\u7f16\u8bd1: ",(0,n.yg)("inlineCode",{parentName:"p"},"mvn clean install -DskipTests"))),(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u5728 ",(0,n.yg)("inlineCode",{parentName:"p"},"jvm")," \u52a0\u5165\u53c2\u6570 ",(0,n.yg)("inlineCode",{parentName:"p"},"--add-opens=java.base/java.nio=org.apache.arrow.memory.core,ALL-UNNAMED"))),(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u542f\u52a8",(0,n.yg)("inlineCode",{parentName:"p"},"springboot manager"),"\u670d\u52a1 ",(0,n.yg)("inlineCode",{parentName:"p"},"manager/src/main/java/org/apache/hertzbeat/hertzbeat-manager/Manager.java")))),(0,n.yg)("h4",{id:"\u524d\u7aef\u542f\u52a8"},"\u524d\u7aef\u542f\u52a8"),(0,n.yg)("ol",null,(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u9700\u8981 ",(0,n.yg)("inlineCode",{parentName:"p"},"nodejs yarn")," \u73af\u5883, \u786e\u4fdd ",(0,n.yg)("inlineCode",{parentName:"p"},"Node.js >= 18"))),(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u8fdb\u5165 ",(0,n.yg)("inlineCode",{parentName:"p"},"web-app")," \u76ee\u5f55: ",(0,n.yg)("inlineCode",{parentName:"p"},"cd web-app"))),(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u5b89\u88c5 yarn: ",(0,n.yg)("inlineCode",{parentName:"p"},"npm install -g yarn"))),(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u5728\u524d\u7aef\u5de5\u7a0b\u76ee\u5f55 ",(0,n.yg)("inlineCode",{parentName:"p"},"web-app")," \u4e0b\u6267\u884c: ",(0,n.yg)("inlineCode",{parentName:"p"},"yarn install")," or ",(0,n.yg)("inlineCode",{parentName:"p"},"yarn install --registry=https://registry.npmmirror.com")," in ",(0,n.yg)("inlineCode",{parentName:"p"},"web-app"))),(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u5f85\u672c\u5730\u540e\u7aef\u542f\u52a8\u540e\uff0c\u5728 web-app \u76ee\u5f55\u4e0b\u542f\u52a8\u672c\u5730\u524d\u7aef ",(0,n.yg)("inlineCode",{parentName:"p"},"yarn start"))),(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u6d4f\u89c8\u5668\u8bbf\u95ee localhost:4200 \u5373\u53ef\u5f00\u59cb\uff0c\u9ed8\u8ba4\u8d26\u53f7\u5bc6\u7801 ",(0,n.yg)("strong",{parentName:"p"},"admin/hertzbeat")))),(0,n.yg)("h3",{id:"\u5bfb\u627e\u4efb\u52a1"},"\u5bfb\u627e\u4efb\u52a1"),(0,n.yg)("p",null,"\u5bfb\u627e\u60a8\u611f\u5174\u8da3\u7684 Issue\uff01\u5728\u6211\u4eec\u7684 GitHub \u4ed3\u5e93\u548c\u90ae\u4ef6\u5217\u8868\u4e2d\uff0c\u6211\u4eec\u7ecf\u5e38\u4f1a\u53d1\u5e03\u4e00\u4e9b\u5e26\u6709 good first issue \u6216\u8005 status: volunteer wanted \u6807\u7b7e\u7684 issue\uff0c\u8fd9\u4e9bissue\u90fd\u6b22\u8fce\u8d21\u732e\u8005\u7684\u5e2e\u52a9\u3002\n\u5176\u4e2d good first issue \u5f80\u5f80\u95e8\u69db\u8f83\u4f4e\u3001\u9002\u5408\u65b0\u624b\u3002"),(0,n.yg)("p",null,"\u5f53\u7136\uff0c\u5982\u679c\u60a8\u6709\u597d\u7684\u60f3\u6cd5\uff0c\u4e5f\u53ef\u4ee5\u76f4\u63a5\u5728 GitHub Discussion \u4e2d\u63d0\u51fa\u6216\u8005\u8054\u7cfb\u793e\u533a\u3002"),(0,n.yg)("h3",{id:"\u63d0\u4ea4-pull-request"},"\u63d0\u4ea4 Pull Request"),(0,n.yg)("ol",null,(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u9996\u5148\u60a8\u9700\u8981 Fork \u76ee\u6807\u4ed3\u5e93 ",(0,n.yg)("a",{parentName:"p",href:"https://github.com/apache/hertzbeat"},"hertzbeat repository"),".")),(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u7136\u540e \u7528 git \u547d\u4ee4 \u5c06\u4ee3\u7801\u4e0b\u8f7d\u5230\u672c\u5730:"),(0,n.yg)("pre",{parentName:"li"},(0,n.yg)("code",{parentName:"pre",className:"language-shell"},"git clone git@github.com:${YOUR_USERNAME}/hertzbeat.git #Recommended  \n"))),(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u4e0b\u8f7d\u5b8c\u6210\u540e\uff0c\u8bf7\u53c2\u8003\u76ee\u6807\u4ed3\u5e93\u7684\u5165\u95e8\u6307\u5357\u6216\u8005 README \u6587\u4ef6\u5bf9\u9879\u76ee\u8fdb\u884c\u521d\u59cb\u5316\u3002")),(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u63a5\u7740\uff0c\u60a8\u53ef\u4ee5\u53c2\u8003\u5982\u4e0b\u547d\u4ee4\u8fdb\u884c\u4ee3\u7801\u7684\u63d0\u4ea4, \u5207\u6362\u65b0\u7684\u5206\u652f, \u8fdb\u884c\u5f00\u53d1:"),(0,n.yg)("pre",{parentName:"li"},(0,n.yg)("code",{parentName:"pre",className:"language-shell"},"git checkout -b a-feature-branch #Recommended  \n"))),(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u63d0\u4ea4 commit, commit \u63cf\u8ff0\u4fe1\u606f\u9700\u8981\u7b26\u5408\u7ea6\u5b9a\u683c\u5f0f: ","[module name or type name]","feature or bugfix or doc: custom message."),(0,n.yg)("pre",{parentName:"li"},(0,n.yg)("code",{parentName:"pre",className:"language-shell"},"git add <modified file/path> \ngit commit -m '[docs]feature: necessary instructions' #Recommended \n"))),(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u63a8\u9001\u5230\u8fdc\u7a0b\u4ed3\u5e93"),(0,n.yg)("pre",{parentName:"li"},(0,n.yg)("code",{parentName:"pre",className:"language-shell"},"git push origin a-feature-branch   \n"))),(0,n.yg)("li",{parentName:"ol"},(0,n.yg)("p",{parentName:"li"},"\u7136\u540e\u60a8\u5c31\u53ef\u4ee5\u5728 GitHub \u4e0a\u53d1\u8d77\u65b0\u7684 PR (Pull Request)\u3002"),(0,n.yg)("p",{parentName:"li"},"\u8bf7\u6ce8\u610f PR \u7684\u6807\u9898\u9700\u8981\u7b26\u5408\u6211\u4eec\u7684\u89c4\u8303\uff0c\u5e76\u4e14\u5728 PR \u4e2d\u5199\u4e0a\u5fc5\u8981\u7684\u8bf4\u660e\uff0c\u6765\u65b9\u4fbf Committer \u548c\u5176\u4ed6\u8d21\u732e\u8005\u8fdb\u884c\u4ee3\u7801\u5ba1\u67e5\u3002"))),(0,n.yg)("h3",{id:"\u7b49\u5f85pr\u4ee3\u7801\u88ab\u5408\u5e76"},"\u7b49\u5f85PR\u4ee3\u7801\u88ab\u5408\u5e76"),(0,n.yg)("p",null,"\u5728\u63d0\u4ea4\u4e86 PR \u540e\uff0cCommitter \u6216\u8005\u793e\u533a\u7684\u5c0f\u4f19\u4f34\u4eec\u4f1a\u5bf9\u60a8\u63d0\u4ea4\u7684\u4ee3\u7801\u8fdb\u884c\u5ba1\u67e5\uff08Code Review\uff09\uff0c\u4f1a\u63d0\u51fa\u4e00\u4e9b\u4fee\u6539\u5efa\u8bae\uff0c\u6216\u8005\u662f\u8fdb\u884c\u4e00\u4e9b\u8ba8\u8bba\uff0c\u8bf7\u53ca\u65f6\u5173\u6ce8\u60a8\u7684PR\u3002"),(0,n.yg)("p",null,"\u82e5\u540e\u7eed\u9700\u8981\u6539\u52a8\uff0c\u4e0d\u9700\u8981\u53d1\u8d77\u4e00\u4e2a\u65b0\u7684 PR\uff0c\u5728\u539f\u6709\u7684\u5206\u652f\u4e0a\u63d0\u4ea4 commit \u5e76\u63a8\u9001\u5230\u8fdc\u7a0b\u4ed3\u5e93\u540e\uff0cPR\u4f1a\u81ea\u52a8\u66f4\u65b0\u3002"),(0,n.yg)("p",null,"\u53e6\u5916\uff0c\u6211\u4eec\u7684\u9879\u76ee\u6709\u6bd4\u8f83\u89c4\u8303\u548c\u4e25\u683c\u7684 CI \u68c0\u67e5\u6d41\u7a0b\uff0c\u5728\u63d0\u4ea4 PR \u4e4b\u540e\u4f1a\u89e6\u53d1 CI\uff0c\u8bf7\u6ce8\u610f\u662f\u5426\u901a\u8fc7 CI \u68c0\u67e5\u3002"),(0,n.yg)("p",null,"\u6700\u540e\uff0cCommitter \u53ef\u4ee5\u5c06 PR \u5408\u5e76\u5165 master \u4e3b\u5206\u652f\u3002"),(0,n.yg)("h3",{id:"\u4ee3\u7801\u88ab\u5408\u5e76\u540e"},"\u4ee3\u7801\u88ab\u5408\u5e76\u540e"),(0,n.yg)("p",null,"\u5728\u4ee3\u7801\u88ab\u5408\u5e76\u540e\uff0c\u60a8\u5c31\u53ef\u4ee5\u5728\u672c\u5730\u548c\u8fdc\u7a0b\u4ed3\u5e93\u5220\u9664\u8fd9\u4e2a\u5f00\u53d1\u5206\u652f\u4e86\uff1a"),(0,n.yg)("pre",null,(0,n.yg)("code",{parentName:"pre",className:"language-shell"},"git branch -d a-dev-branch\ngit push origin --delete a-dev-branch\n")),(0,n.yg)("p",null,"\u5728\u4e3b\u5206\u652f\u4e0a\uff0c\u60a8\u53ef\u4ee5\u6267\u884c\u4ee5\u4e0b\u64cd\u4f5c\u6765\u540c\u6b65\u4e0a\u6e38\u4ed3\u5e93\uff1a"),(0,n.yg)("pre",null,(0,n.yg)("code",{parentName:"pre",className:"language-shell"},"git remote add upstream https://github.com/apache/hertzbeat.git #Bind the remote warehouse, if it has been executed, it does not need to be executed again\ngit checkout master \ngit pull upstream master\n")),(0,n.yg)("h3",{id:"\u5982\u4f55\u6210\u4e3a-committer"},"\u5982\u4f55\u6210\u4e3a Committer\uff1f"),(0,n.yg)("p",null,"\u901a\u8fc7\u4e0a\u8ff0\u6b65\u9aa4\uff0c\u60a8\u5c31\u662f HertzBeat \u7684\u8d21\u732e\u8005\u4e86\u3002\u91cd\u590d\u524d\u9762\u7684\u6b65\u9aa4\uff0c\u5728\u793e\u533a\u4e2d\u4fdd\u6301\u6d3b\u8dc3\uff0c\u575a\u6301\u4e0b\u53bb\uff0c\u60a8\u5c31\u80fd\u6210\u4e3a Committer\uff01"),(0,n.yg)("h3",{id:"\u52a0\u5165\u8ba8\u8bba\u4ea4\u6d41"},"\u52a0\u5165\u8ba8\u8bba\u4ea4\u6d41"),(0,n.yg)("p",null,(0,n.yg)("a",{parentName:"p",href:"https://github.com/apache/hertzbeat/discussions"},"Github Discussion")),(0,n.yg)("p",null,"\u52a0\u5fae\u4fe1\u53f7 ",(0,n.yg)("inlineCode",{parentName:"p"},"ahertzbeat")," \u62c9\u60a8\u8fdb\u5fae\u4fe1\u4ea4\u6d41\u7fa4"),(0,n.yg)("h3",{id:"\u6a21\u5757"},"\u6a21\u5757"),(0,n.yg)("ul",null,(0,n.yg)("li",{parentName:"ul"},(0,n.yg)("strong",{parentName:"li"},(0,n.yg)("a",{parentName:"strong",href:"https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager"},"manager"))," \u63d0\u4f9b\u76d1\u63a7\u7ba1\u7406,\u7cfb\u7edf\u7ba1\u7406\u57fa\u7840\u670d\u52a1")),(0,n.yg)("blockquote",null,(0,n.yg)("p",{parentName:"blockquote"},"\u63d0\u4f9b\u5bf9\u76d1\u63a7\u7684\u7ba1\u7406\uff0c\u76d1\u63a7\u5e94\u7528\u914d\u7f6e\u7684\u7ba1\u7406\uff0c\u7cfb\u7edf\u7528\u6237\u79df\u6237\u540e\u53f0\u7ba1\u7406\u7b49\u3002"),(0,n.yg)("ul",{parentName:"blockquote"},(0,n.yg)("li",{parentName:"ul"},(0,n.yg)("strong",{parentName:"li"},(0,n.yg)("a",{parentName:"strong",href:"https://github.com/apache/hertzbeat/tree/master/hertzbeat-collector"},"collector"))," \u63d0\u4f9b\u76d1\u63a7\u6570\u636e\u91c7\u96c6\u670d\u52a1\n\u4f7f\u7528\u901a\u7528\u534f\u8bae\u8fdc\u7a0b\u91c7\u96c6\u83b7\u53d6\u5bf9\u7aef\u6307\u6807\u6570\u636e\u3002"),(0,n.yg)("li",{parentName:"ul"},(0,n.yg)("strong",{parentName:"li"},(0,n.yg)("a",{parentName:"strong",href:"https://github.com/apache/hertzbeat/tree/master/hertzbeat-warehouse"},"warehouse"))," \u63d0\u4f9b\u76d1\u63a7\u6570\u636e\u4ed3\u50a8\u670d\u52a1\n\u91c7\u96c6\u6307\u6807\u7ed3\u679c\u6570\u636e\u7ba1\u7406\uff0c\u6570\u636e\u843d\u76d8\uff0c\u67e5\u8be2\uff0c\u8ba1\u7b97\u7edf\u8ba1\u3002"),(0,n.yg)("li",{parentName:"ul"},(0,n.yg)("strong",{parentName:"li"},(0,n.yg)("a",{parentName:"strong",href:"https://github.com/apache/hertzbeat/tree/master/hertzbeat-alerter"},"alerter"))," \u63d0\u4f9b\u544a\u8b66\u670d\u52a1\n\u544a\u8b66\u8ba1\u7b97\u89e6\u53d1\uff0c\u4efb\u52a1\u72b6\u6001\u8054\u52a8\uff0c\u544a\u8b66\u914d\u7f6e\uff0c\u544a\u8b66\u901a\u77e5\u3002"),(0,n.yg)("li",{parentName:"ul"},(0,n.yg)("strong",{parentName:"li"},(0,n.yg)("a",{parentName:"strong",href:"https://github.com/apache/hertzbeat/tree/master/web-app"},"web-app"))," \u63d0\u4f9b\u53ef\u89c6\u5316\u63a7\u5236\u53f0\u9875\u9762\n\u76d1\u63a7\u544a\u8b66\u7cfb\u7edf\u53ef\u89c6\u5316\u63a7\u5236\u53f0\u524d\u7aef"))),(0,n.yg)("p",null,(0,n.yg)("img",{alt:"hertzBeat",src:a(72428).A,width:"2814",height:"1772"})))}y.isMDXComponent=!0},72428:(e,t,a)=>{a.d(t,{A:()=>r});const r=a.p+"assets/images/hertzbeat-arch-d8c2eca122dd35a5e67678da69c8ba0c.png"}}]);