import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync(".env","utf8").split(/\r?\n/).map(l=>l.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^"|"$/g,"")]));
const URL_ = env.CAJA_NEGRA_URL.replace(/\/$/,"");
const H = { Authorization: "Bearer " + env.CAJA_NEGRA_TOKEN_2, "Content-Type": "application/json" };
const M=97,mod=x=>((x%M)+M)%M,pow10=n=>{let r=1;for(let i=0;i<n;i++)r=mod(r*10);return r};
const inv=a=>{for(let x=1;x<M;x++)if(a*x%M===1)return x};const norm=x=>{x=mod(x);return x<2?x+97:x};
const horner=s=>{let h=0;for(const ch of s)h=mod(h*10+Number(ch));return h};
function family(kb,kc){const m=kb.match(/^(.*?)(\d+)$/);const amt=m[2];const h=mod((1-kc)*inv(3));const P=mod((h-horner(amt))*inv(pow10(amt.length)));return a=>norm(1-3*mod(P*pow10(String(a).length)+horner(String(a))))}
const ctrlDep=family("DEPOSITO;AC-0001;250000",86);
let calls=0,last=0;
async function msg(m){const w=last+125-Date.now();if(w>0)await new Promise(r=>setTimeout(r,w));last=Date.now();calls++;const r=await fetch(URL_+"/msg",{method:"POST",headers:H,body:JSON.stringify({m})});return {status:r.status,text:await r.text()}}
const reset=()=>fetch(URL_+"/__reset",{method:"POST",headers:H});
async function withCtrl(body){ // sweep to find valid control for a body that ends in a field
  for(let c=0;c<100;c++){const r=await msg(`${body};${String(c).padStart(2,"0")}`);if(!(r.status===400&&r.text.includes("E202")))return {c:String(c).padStart(2,"0"),r}}
  return {c:null,r:null};
}
await reset(); await msg("ALTA;Lucia;82");
console.log("== max amount (deposit, account exists) ==");
for(const a of [999999,1000000,9999999,99999999,100000000]){const r=await msg(`DEPOSITO;AC-0001;${a};${ctrlDep(a)}`);console.log(a,"->",r.status,r.text)}
console.log("== formats ==");
for(const a of ["12.5","-5","abc"," 700","+700"]){const r=await msg(`DEPOSITO;AC-0001;${a};00`);console.log(JSON.stringify(a),"naive ->",r.status,r.text);const w=await withCtrl(`DEPOSITO;AC-0001;${a}`);console.log("   withCtrl",JSON.stringify(a),w.c,"->",w.r&&`${w.r.status} ${w.r.text}`)}
console.log("== account missing vs amount invalid (DEPOSITO;AC-0009;700) ==");
{const w=await withCtrl("DEPOSITO;AC-0009;700");console.log("valid ctrl",w.c,"->",w.r.status,w.r.text)}
{const w=await withCtrl("DEPOSITO;AC-0009;0");console.log("amount 0, missing acct ctrl",w.c,"->",w.r.status,w.r.text)}
console.log("== missing control / empty ==");
for(const m of ["PING","CONSULTA","PING;",";","PING;X;Y"]){const r=await msg(m);console.log(JSON.stringify(m),"->",r.status,r.text)}
console.log("calls",calls);
