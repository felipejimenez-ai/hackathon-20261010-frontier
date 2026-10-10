import { spawn } from "node:child_process";
const p=spawn(process.execPath,["src/server.mjs"],{env:{...process.env,PORT:"8137"}});
await new Promise(r=>setTimeout(r,800));
const b="http://127.0.0.1:8137";
async function call(body){const r=await fetch(b+"/msg",{method:"POST",headers:{Authorization:"Bearer t","Content-Type":"application/json"},body});return [r.status,await r.text()]}
console.log("null body:",await call("null"));
console.log("empty:",await call(""));
console.log("bad json:",await call("{oops"));
console.log("no m:",await call("{}"));
console.log("number m:",await call('{"m":5}'));
console.log("alive after:",await call('{"m":"PING;0"}'));
p.kill();
