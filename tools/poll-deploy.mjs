import fs from "node:fs";
const env=Object.fromEntries(fs.readFileSync(".env","utf8").split(/\r?\n/).map(l=>l.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^"|"$/g,"")]));
const u="https://hackathon-20261010-frontier-production.up.railway.app";
const h={Authorization:"Bearer "+env.ENTRYPOINT_TOKEN,"Content-Type":"application/json"};
for(let i=0;i<24;i++){const r=await fetch(u+"/msg",{method:"POST",headers:h,body:JSON.stringify({m:"PING"})});const t=await r.text();console.log(i,r.status,t);if(r.status===400&&t.includes("E103")){console.log("DEPLOYED v2");break}await new Promise(x=>setTimeout(x,15000));}
