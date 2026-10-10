import fs from "node:fs";
const env=Object.fromEntries(fs.readFileSync(".env","utf8").split(/\r?\n/).map(l=>l.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^"|"$/g,"")]));
const URL_=env.CAJA_NEGRA_URL.replace(/\/$/,"");const H={Authorization:"Bearer "+env.CAJA_NEGRA_TOKEN_2,"Content-Type":"application/json"};
let calls=0,last=0;async function msg(m){const w=last+130-Date.now();if(w>0)await new Promise(r=>setTimeout(r,w));last=Date.now();calls++;const r=await fetch(URL_+"/msg",{method:"POST",headers:H,body:JSON.stringify({m})});const t=await r.text();if(r.status===429)throw new Error("429");return{s:r.status,t}}
const reset=()=>fetch(URL_+"/__reset",{method:"POST",headers:H});
async function withCtrl(body){for(let c=0;c<100;c++){const cc=String(c).padStart(2,"0");const r=await msg(`${body};${cc}`);if(!(r.s===400&&(r.t.includes("E202")||r.t.includes("E201"))))return{c:cc,r}}return{c:null,r:null}}
const show=(l,r)=>console.log(`${l} -> ${r.s} ${r.t}`);
await reset();await msg("ALTA;Lucia;82");await msg("ALTA;Mateo;3");
console.log("== orden E304 ==");
{const w=await withCtrl("TRANSFER;AC-0001;AC-0001;0");show("mismo + monto 0 -> ? (E303 vs E304) ctrl="+w.c,w.r)}
{const w=await withCtrl("TRANSFER;AC-0001;AC-0001;70000");show("mismo + sobre limite (E304 vs E506) ctrl="+w.c,w.r)}
{const w=await withCtrl("TRANSFER;AC-9999;AC-9999;500");show("mismo + cuenta inexistente (E401 vs E304) ctrl="+w.c,w.r)}
{const w=await withCtrl("TRANSFER;AC-0001;AC-0001;500");show("mismo + saldo insuf (E304 vs E507) ctrl="+w.c,w.r)}
console.log("== refresh: does failed transfer consume OP id? ==");
await reset();await msg("ALTA;Lucia;82");await msg("ALTA;Mateo;3");await msg("DEPOSITO;AC-0001;700;28");
const f=await withCtrl("TRANSFER;AC-0001;AC-0002;70000");show("transfer sobre limite ctrl="+f.c,f.r);
show("DEPOSITO AC-0002 700 -> OP id?",await msg("DEPOSITO;AC-0002;700;35"));
console.log("calls",calls);
