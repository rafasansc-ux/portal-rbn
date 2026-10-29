const fs=require('node:fs');
const core=fs.readFileSync('lib/feed-core.mjs','utf8')
 .replace("import {XMLParser,XMLValidator} from 'fast-xml-parser';","const {XMLParser,XMLValidator}=require('fast-xml-parser');")
 .replace(/export \{([^}]+)\};/,'module.exports={$1};');
fs.writeFileSync('lib/feed-core.cjs',"// Generated from feed-core.mjs by tools/build-core.cjs.\n"+core);
