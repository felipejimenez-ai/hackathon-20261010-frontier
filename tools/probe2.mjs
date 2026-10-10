import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(".env","utf8").split(/\r?\n/).map(l=>l.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^"|"$/g,"")]));
const URL_ = env.CAJA_NEGRA_URL.replace(/\/$/,"");
const H = { Authorization: "Bearer " + env.CAJA_NEGRA_TOKEN_2, "Content-Type": "application/json" };
const CAP=650, START=0; let calls=0, last=0;
const M=97,mod=x=>((x%M)+M)%M,p10=n=>{let r=1;for(let i=0;i<n;i++)r=mod(r*10);return r},inv=a=>{for(let x=1;x<M;x++)if(a*x%M===1)return x},norm=x=>{x=mod(x);return x<2?x+97:x};
const horner=s=>{let h=0;for(const ch of s)h=mod(h*10+Number(ch));return h};
const fam=(kb,kc)=>{const m=kb.match(/^(.*?)(\d+)$/);const h=mod((1-kc)*inv(3));const P=mod((h-horner(m[2]))*inv(p10(m[2].length)));return a=>norm(1-3*mod(P*p10(String(a).length)+horner(String(a))))};
import { modelControl } from "../src/checksum.mjs";
async function raw(path, init, label){
  if(calls>=CAP) throw new Error("cap");
  const w=last+130-Date.now(); if(w>0) await new Promise(r=>setTimeout(r,w)); last=Date.now(); calls++;
  const r=await fetch(URL_+path, init); const t=await r.text();
  if(r.status===429) throw new Error("429");
  fs.appendFileSync("experimentos.jsonl","\n"+JSON.stringify({id:11000+calls,seq:"incidente:probe2",x_req:String(calls),hipotesis:label,request:init._body!==undefined?{raw:init._body}:{method:init.method,path},status:r.status,response:t,conclusion:`${r.status} ${t}`}));
  return {s:r.status,t};
}
const msg=(m)=>raw("/msg",{method:"POST",headers:H,body:JSON.stringify({m}),_body:JSON.stringify({m})},"edge: "+m);
const rawBody=(b)=>raw("/msg",{method:"POST",headers:H,body:b,_body:b},"raw body "+JSON.stringify(b));
const reset=()=>fetch(URL_+"/__reset",{method:"POST",headers:H});
const show=(l,r)=>console.log(`${l} -> ${r.s} ${r.t}`);

// A) body edge cases
console.log("== body edges ==");
for(const b of ["null","","{oops","{}",'{"m":5}','{"m":[]}','{"m":null}','{"x":"PING;0"}']) show("raw "+JSON.stringify(b), await rawBody(b));
show("GET /msg", await raw("/msg",{method:"GET",headers:H},"GET /msg"));
show("POST /health", await raw("/health",{method:"POST",headers:H,body:"{}",_body:"{}"},"POST /health"));

// B) control range on a table body
console.log("== control range (ALTA;Lucia valid=82) ==");
for(const c of ["00","0","1","2","97","98","99","100","999"]) show(`ALTA;Lucia;${c}`, await msg(`ALTA;Lucia;${c}`));

// C) CONSULTA id model check
console.log("== CONSULTA id model ==");
let modelFails=[];
for(const n of ["0004","0005","0006","0007","0008","0010","0011","0012","0020","0050","0099","0100","0500","1000","1234","9999"]){
  const body=`CONSULTA;AC-${n}`; const c=modelControl(body);
  const r=await msg(`${body};${c}`);
  const ok=!(r.s===400&&r.t.includes("E202"));
  if(!ok)modelFails.push(n);
  show(`AC-${n} model ctrl ${c} ${ok?"OK":"MODELFAIL"}`, r);
  const r2=await msg(`${body};${(c+1)%100}`);
  show(`AC-${n} ctrl+1 (expect E202) ${r2.s===400&&r2.t.includes("E202")?"ok":"UNEXPECTED"}`, r2);
}
console.log("modelFails:",modelFails);
console.log("calls",calls);
