```
"Are you the top 1% of technical talent in the region?"

That question is why I applied to the Lab10 hackathon.

I joined to prove my skills — not with a test, but by building something hard in a day.

The challenge: The Black Box. An HTTP service running in production for 10 years. No source. No docs. The people who wrote it are gone. And if it goes down, the company goes down.

We couldn't open it. We could only ask it.

How I solved it:
1. Recon — treated it as an oracle. 15,000+ requests, every answer recorded.
2. Inference — for each input→output pair I formed a hypothesis of the rule, isolated one variable, measured, adjusted, verified against everything known, then encoded it.
3. Rebuild — my own service, answering byte for byte the same: same errors, same typos.

The turning point: the last field was a checksum. I assumed modulo 100 and it was off by 3. That +3 was the clue — 100 minus 97 is 3. The real modulus was 97. Result: 71/100 hidden tests, up from 42 to 63 to 71.

The scoring worked like the evals top AI labs (like @Anthropic or @OpenAI) run for it recruiting process: a hidden test set, exact-match scoring, one measured pass rate.

The biggest lessons:
• Analyze and design the system first.
• The pitch and the debrief force real technical depth. If you can't explain it, you don't understand it.

What I didn't expect: the people. Founders, and companies scouting the region's best technical talent.

Would you apply to a challenge like this?

#Hackathon #AI #SoftwareEngineering #SystemDesign #ReverseEngineering #Frontier #Lab10 LAB10 Nubank Rappi Mercado Libre ScotiaTech Bold Addi Habi AWS Elemental Dapta Truora Inc. Braven Inerxia Inc. Blinka (YC F26)7 Domu Idilio TV Creditop EPAM Systems Globant Blend
```