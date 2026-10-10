import fs from "node:fs";
const env=Object.fromEntries(fs.readFileSync(".env","utf8").split(/\r?\n/).map(l=>l.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^"|"$/g,"")]));
const URL_=env.CAJA_NEGRA_URL.replace(/\/$/,"");const H={Authorization:"Bearer "+env.CAJA_NEGRA_TOKEN_2,"Content-Type":"application/json"};
let calls=0,last=0;async function msg(m){const w=last+130-Date.now();if(w>0)await new Promise(r=>setTimeout(r,w));last=Date.now();calls++;const r=await fetch(URL_+"/msg",{method:"POST",headers:H,body:JSON.stringify({m})});const t=await r.text();if(r.status===429)throw new Error("429");fs.appendFileSync("experimentos.jsonl","\n"+JSON.stringify({id:12000+calls,seq:"incidente:probe3",x_req:String(calls),hipotesis:"estado/ANULA/limite",request:{m},status:r.status,response:t,conclusion:`${r.status} ${t}`}));return{s:r.status,t}}
const reset=()=>fetch(URL_+"/__reset",{method:"POST",headers:H});
const M=97,mod=x=>((x%M)+M)%M,p10=n=>{let r=1;for(let i=0;i<n;i++)r=mod(r*10);return r},inv=a=>{for(let x=1;x<M;x++)if(a*x%M===1)return x},norm=x=>{x=mod(x);return x<2?x+97:x};
const gl=ch=>{if(ch>="0"&&ch<="9")return ch.charCodeAt(0)-48;const x=(ch.charCodeAt(0)-64)%17;return x>9?x-17:x};
async function withCtrl(body){for(let c=0;c<100;c++){const cc=String(c).padStart(2,"0");const r=await msg(`${body};${cc}`);if(!(r.s===400&&(r.t.includes("E202")||r.t.includes("E201"))))return{c:cc,r}}return{c:null,r:null}}
const show=(l,r)=>console.log(`${l} -> ${r.s} ${r.t}`);
console.log("== ANULA depósito y luego retirar fondos (saldo negativo?) ==");
await reset();show("ALTA",await msg("ALTA;Lucia;82"));show("ALTA",await msg("ALTA;Mateo;3"));
show("DEPOSITO 700",await msg("DEPOSITO;AC-0001;700;28"));
{const w=await withCtrl("TRANSFER;AC-0001;AC-0002;500");show("TRANSFER 500 ctrl="+w.c,w.r)}
show("CONSULTA AC-0001",await msg("CONSULTA;AC-0001;14"));
show("ANULA OP-0001 (dep)",await msg("ANULA;OP-0001;72"));
show("CONSULTA AC-0001 (tras anular dep)",await msg("CONSULTA;AC-0001;14"));
show("CONSULTA AC-0002",await msg("CONSULTA;AC-0002;11"));
console.log("== transfer a la misma cuenta ==");
await reset();await msg("ALTA;Lucia;82");await msg("ALTA;Mateo;3");await msg("DEPOSITO;AC-0001;700;28");
{const w=await withCtrl("TRANSFER;AC-0001;AC-0001;500");show("TRANSFER a si mismo ctrl="+w.c,w.r)}
show("CONSULTA AC-0001",await msg("CONSULTA;AC-0001;14"));
console.log("== E506 vs E401 (cuenta inexistente + sobre limite) ==");
{const w=await withCtrl("TRANSFER;AC-9999;AC-9998;50001");show("TRANSFER AC-9999->AC-9998 50001 ctrl="+w.c,w.r)}
console.log("== lowercase op id, ALTA vacía / aridad ==");
{const w=await withCtrl("ANULA;op-0001");show("ANULA op-0001 ctrl="+w.c,w.r)}
show("ALTA vacía",await msg("ALTA;;82"));
show("ALTA 2 args",await msg("ALTA;A;B;82"));
console.log("calls",calls);
