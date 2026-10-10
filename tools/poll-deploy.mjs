import fs from "node:fs";
const env=Object.fromEntries(fs.readFileSync(".env","utf8").split(/\r?\n/).map(l=>l.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^"|"$/g,"")]));
const u="https://hackathon-20261010-frontier-production.up.railway.app";
const team=env.ENTRYPOINT_TOKEN; const shaped=team.slice(0,4)+"Z".repeat(team.length-4);
const opt={method:"POST",headers:{Authorization:"Bearer "+shaped,"Content-Type":"application/json"},body:JSON.stringify({m:"PING;0"})};
for(let i=0;i<24;i++){const r=await fetch(u+"/msg",opt);const t=await r.text();console.log(i,r.status,t);if(r.status===200){console.log("DEPLOYED");break}await new Promise(x=>setTimeout(x,15000));}
