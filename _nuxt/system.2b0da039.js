import{a as S,_ as $}from"./CreateSystem.49dd4c29.js";import{A as C,e as I,u as x,t as p,z as g,B as h,C as y,b as B}from"./editorStore.bbe35a2c.js";import{a as b,o as l,f as i,F as u,l as _,b as E,B as D,i as c,t as f,h as m,p as A,c as L,z as N,s as P,x as T}from"./entry.8c945047.js";import{_ as F}from"./Loading.1bc702c1.js";const z={emits:["selected"],data(){return{uploading:!1}},computed:{electron(){return!!globalThis.electron}},methods:{async popFileInput(){var e;if(!globalThis.electron)throw new Error("SelectFile is for use in electron app only");try{this.uploading=!0;const t=await C({properties:["openDirectory"]});(e=t==null?void 0:t.filePaths)!=null&&e.length&&this.$emit("selected",t.filePaths)}catch(t){console.error(t)}finally{this.uploading=!1}}}};const U=["disabled"],V={key:1};function W(e,t,o,a,s,n){return n.electron?(l(),i("button",{key:0,onClick:t[0]||(t[0]=(...r)=>n.popFileInput&&n.popFileInput(...r)),class:"bouton",disabled:s.uploading},[s.uploading?(l(),i(u,{key:1},[_(" ... ")],64)):(l(),i(u,{key:0},[_("Set Working Folder")],64))],8,U)):(l(),i("span",V,"<SelectFolder> is only available in electron app"))}const j=b(z,[["render",W],["__scopeId","data-v-e706e417"]]),O=E({components:{CreateSystem:S,Loading:F},head(){return{title:"NR-Editor"}},data(){return{loading:!0,systems:[],progress:0,progress_max:0,progress_msg:"",error_msg:""}},setup(){return{cataloguesStore:I(),store:x(),settings:D()}},methods:{async selectedFolder(e){this.settings.systemsFolder=Array.isArray(e)?e[0]:e,this.update()},async selected(e){if(electron){this.loading=!0,this.progress_msg="";const t=await this.store.load_systems_from_folder(e.path,async(o,a,s)=>(this.progress=o,this.progress_max=a,this.progress_msg=s?s.replaceAll("\\","/").split("/").slice(-1)[0]:"",new Promise(r=>setTimeout(r,1))));this.loading=!1,this.$router.push(`/?id=${t.join(",")}`)}},async uploaded(e){console.log("Uploaded",e.length,"files",e);const t=e.filter(s=>s.gameSystem),o=[];for(const s of t){const n=s.gameSystem.id;o.push(n);const r=p(s);this.store.get_system(n).setSystem(s),electron||g.systems.put({content:s,id:r}),this.cataloguesStore.updateCatalogue(s.gameSystem),this.cataloguesStore.setEdited(r,!1)}const a=e.filter(s=>s.catalogue);for(const s of a){const n=s.catalogue.gameSystemId;this.store.get_system(n).setCatalogue(s),electron||g.catalogues.put({content:s,id:p(s)}),this.cataloguesStore.updateCatalogue(s.catalogue),this.cataloguesStore.setEdited(p(s),!1)}this.$router.push(`/?id=${o.join(",")}`)},async update(e){try{const t=[];if(electron)if(this.settings.systemsFolder){const o=await h(this.settings.systemsFolder);o&&t.push(...o)}else{const o=await y("home"),a=await h(`${o}/BattleScribe/data`);a&&t.push(...a)}else for(let o=0;o<100;o++)t.push({name:"Warhammer 40k",path:"BSData/wh40k"});this.systems=B(t,o=>o.name),this.systems.forEach(o=>{var a,s;o.highlight=o.name===((s=(a=e==null?void 0:e.gameSystem)==null?void 0:a.gameSystem)==null?void 0:s.name)})}finally{this.loading=!1}}},async mounted(){if(!this.settings.systemsFolder){const e=await y("home");this.settings.systemsFolder=`${e}/BattleScribe/data`}await this.update()}});const R=e=>(P("data-v-9b7fe2b3"),e=e(),T(),e),Y={key:0,class:"scrollable"},q={class:"mt-10px p-10px"},G={class:"workdir"},H={class:"boutons"},J=R(()=>c("p",null,"You can open a system by clicking any of the systems in your working folder, listed below, or click Load System to load a system outside this folder.",-1)),K={class:"p-10px"},M=["onClick"];function Q(e,t,o,a,s,n){const r=$,k=j,w=S,v=F;return e.loading?(l(),L(v,{key:1,progress_msg:e.progress_msg,progress_max:e.progress_max,progress:e.progress},null,8,["progress_msg","progress_max","progress"])):(l(),i("div",Y,[c("div",q,[c("div",null,[_("Working Folder: "),c("span",G,f(e.settings.systemsFolder),1)]),c("div",H,[m(r,{onUploaded:e.uploaded},null,8,["onUploaded"]),m(k,{onSelected:e.selectedFolder},null,8,["onSelected"]),m(w,{onCreated:e.update},null,8,["onCreated"])]),J]),c("div",K,[(l(!0),i(u,null,A(e.systems,d=>(l(),i("div",{class:N(["item p-2px mt-2px cursor-pointer",{highlight:d.highlight}]),onClick:X=>e.selected(d)},f(d.name),11,M))),256))])]))}const oe=b(O,[["render",Q],["__scopeId","data-v-9b7fe2b3"]]);export{oe as default};
