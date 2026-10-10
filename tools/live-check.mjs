import fs from "node:fs";
const env=Object.fromEntries(fs.readFileSync(".env","utf8").split(/\r?\n/).map(l=>l.match(/^\s*([^#=]+?)\s*=\s*(.*)$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^"|"$/g,"")]));
const u="https://hackathon-20261010-frontier-production.up.railway.app",h={Authorization:"Bearer "+env.ENTRYPOINT_TOKEN,"Content-Type":"application/json"};
const msg=async m=>{const r=await fetch(u+"/msg",{method:"POST",headers:h,body:JSON.stringify({m})});return [r.status,await r.text()]};
const reset=()=>fetch(u+"/__reset",{method:"POST",headers:h});
for(let i=0;i<20;i++){await reset();const [s]=await msg("ALTA;Lucia;83");console.log(i,s);if(s===400)break;await new Promise(r=>setTimeout(r,15000));}
await reset();
for(const m of ["ALTA;Lucia;83","ALTA;Lucia;82","ALTA;Mateo;3","DEPOSITO;AC-0001;250000;86","TRANSFER;AC-0001;AC-0002;40000;86","TRANSFER;AC-0001;AC-0002;100000;12","ANULA;OP-0003;66","TRANSFER;AC-0002;AC-0001;50000;23","CONSULTA;AC-0002;11"]) console.log(m,await msg(m));
await reset();
