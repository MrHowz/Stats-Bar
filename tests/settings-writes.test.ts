import {test} from "node:test";
import assert from "node:assert/strict";
import {createSettingsWriter} from "../src/settings-writes.ts";
test("rapid settings edits merge and writes remain serialized across scopes",async()=>{
 const sent:unknown[]=[];let running=0,max=0;
 const write=createSettingsWriter<{offset:number;width:number}>(async(scope,patch)=>{max=Math.max(max,++running);await new Promise(r=>setTimeout(r,5));sent.push({scope,patch});running--;},5);
 const promises=[];for(let offset=0;offset<30;offset++)promises.push(write("scene",{offset}));
 promises.push(write("scene",{width:2}));promises.push(write("room",{width:1}));
 await Promise.all(promises);assert.equal(sent.length,2);assert.equal(max,1);
 assert.deepEqual(sent[0],{scope:"scene",patch:{offset:29,width:2}});
});
test("reset followed by new edits discards prior patches and rejects failed writes without retrying",async()=>{
 let received:unknown;const write=createSettingsWriter<{offset:number}>(async(scope,patch,reset)=>{received={scope,patch,reset};},5);
 await Promise.all([write("scene",{offset:10}),write("scene",null),write("scene",{offset:5})]);
 assert.deepEqual(received,{scope:"scene",patch:{offset:5},reset:true});
 let calls=0;const fail=createSettingsWriter(async()=>{calls++;throw new Error("limited");},5);
 const results=await Promise.allSettled([fail("room",{}),fail("room",{})]);assert.equal(calls,1);assert.ok(results.every(r=>r.status==="rejected"));
});
