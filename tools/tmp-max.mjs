import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(".env","utf8").split(/\r?\n/).map(l=>l.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^"|"$/g,"")]));
const URL_ = env.CAJA_NEGRA_URL.replace(/\/$/,"");const H={Authorization:"Bearer "+env.CAJA_NEGRA_TOKEN_2,"Content-Type":"application/json"};
const M=97,mod=x=>((x%M)+M)%M,pow10=n=>{let r=1;for(let i=0;i<n;i++)r=mod(r*10);return r};const inv=a=>{for(let x=1;x<M;x++)if(a*x%M===1)return x};const norm=x=>{x=mod(x);return x<2?x+97:x};
const horner=s=>{let h=0;for(const ch of s)h=mod(h*10+Number(ch));return h};
const fam=(kb,kc)=>{const m=kb.match(/^(.*?)(\d+)$/);const h=mod((1-kc)*inv(3));const P=mod((h-horner(m[2]))*inv(pow10(m[2].length)));return a=>norm(1-3*mod(P*pow10(String(a).length)+horner(String(a))))};
const dep=fam("DEPOSITO;AC-0001;250000",86);
let last=0;async function msg(m){const w=last+130-Date.now();if(w>0)await new Promise(r=>setTimeout(r,w));last=Date.now();const r=await fetch(URL_+"/msg",{method:"POST",headers:H,body:JSON.stringify({m})});return{status:r.status,text:await r.text()}}
await fetch(URL_+"/__reset",{method:"POST",headers:H});await msg("ALTA;Lucia;82");
for(const a of [999999999,9999999999,19999999999,99999999999,2147483647,2147483648,4294967295,4294967296]){const r=await msg(`DEPOSITO;AC-0001;${a};${dep(a)}`);console.log(a,"->",r.status,r.text)}
