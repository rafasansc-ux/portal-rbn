const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('Parser CommonJS publicado corresponde ao código compartilhado da coleta',()=>{
 const expected="// Generated from feed-core.mjs by tools/build-core.cjs.\n"+fs.readFileSync('lib/feed-core.mjs','utf8').replace("import {XMLParser,XMLValidator} from 'fast-xml-parser';","const {XMLParser,XMLValidator}=require('fast-xml-parser');").replace(/export \{([^}]+)\};/,'module.exports={$1};');
 assert.equal(fs.readFileSync('lib/feed-core.cjs','utf8'),expected);
 assert.equal(typeof require('./lib/feed-core.cjs').parse,'function');
});
