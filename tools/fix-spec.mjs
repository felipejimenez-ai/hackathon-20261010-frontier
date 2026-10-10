import fs from "node:fs";
let s=fs.readFileSync("docs/spec.md","utf8");
s=s.split("\n").map(l=>{
 if(l.startsWith("**Modelo del checksum")) return "**Modelo del checksum (mod 97, casi cerrado).** `control = 98 - r`, `r = (K + sum v(char)*w) mod 97`, con `w = 10^(nº de caracteres no separadores despues)`. Los caracteres **`;` y `-` son aditivos** (no multiplican por 10), y el **comando se pasa a mayusculas pero los argumentos son sensibles a mayuscula**. Digitos `v(d)=d`. Con esto **90/90** pares de igual longitud (variando solo digitos) son consistentes. No se cierran todas las letras, asi que el reemplazo usa modo **hibrido**: `E202` solo a cuerpos conocidos (tabla + modelo `CONSULTA;AC-####`, validado en todas las posiciones de digito) y *lenient* al resto.";
 if(l.startsWith("| IN-15 |")) return "| IN-15 | El control es un checksum determinista de modulo 97; `;` y `-` son aditivos y los argumentos distinguen mayuscula. | 1-120 | probable |";
 return l;}).join("\n");
fs.writeFileSync("docs/spec.md",s,"utf8");
console.log("ok");
