import { spawn } from "node:child_process";
const p=spawn(process.execPath,["src/server.mjs"],{env:process.env});
await new Promise(r=>setTimeout(r,800));const u="http://127.0.0.1:8080";
const call=async(tok)=>{const h={Authorization:"Bearer "+tok,"Content-Type":"application/json"};const r=await fetch(u+"/msg",{method:"POST",headers:h,body:'{"m":"PING;0"}'});return[r.status,await r.text()]};
const team=process.env.ENTRYPOINT_TOKEN;
console.log("exact team:",await call(team));
console.log("shaped (team[:4]+zeros same len):",await call(team.slice(0,4)+"Z".repeat(team.length-4)));
console.log("bogus:",await call("bogus-token-xyz"));
p.kill();
