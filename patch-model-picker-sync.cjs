#!/usr/bin/env node
/**
 * IMPROVED Patch for clauded-cli.js to fetch models SYNCHRONOUSLY from proxy
 * This ensures models are loaded BEFORE the model picker is shown
 */

const fs = require('fs');
const path = require('path');

const CLI_PATH = path.join(process.env.HOME, '.claude/clauded-cli/cli.js');
const BACKUP_PATH = CLI_PATH + '.backup-sync-' + Date.now();

console.log('Patching clauded-cli.js with SYNCHRONOUS model fetching...\n');

// Read CLI file
let content = fs.readFileSync(CLI_PATH, 'utf8');
console.log(`✓ Read CLI file (${(content.length / 1024 / 1024).toFixed(2)} MB)`);

// Backup original
fs.writeFileSync(BACKUP_PATH, content);
console.log(`✓ Created backup: ${BACKUP_PATH}`);

// Find RU3 function
const ru3Start = content.indexOf('function RU3(){');
if (ru3Start === -1) {
  console.error('✗ Could not find RU3() function');
  process.exit(1);
}

// Find matching closing brace
let braceCount = 0;
let ru3End = -1;
for (let i = ru3Start + 'function RU3()'.length; i < content.length; i++) {
  if (content[i] === '{') braceCount++;
  if (content[i] === '}') {
    braceCount--;
    if (braceCount === 0) {
      ru3End = i + 1;
      break;
    }
  }
}

if (ru3End === -1) {
  console.error('✗ Could not find end of RU3() function');
  process.exit(1);
}

const originalRU3 = content.substring(ru3Start, ru3End);
console.log('✓ Found RU3() function (' + originalRU3.length + ' chars)');

// Inject SYNCHRONOUS proxy model fetcher at top of file (after copyright)
// This uses child_process.execSync with curl to block until models are fetched
const syncFetcherCode = `
(function(){
  // SYNCHRONOUSLY fetch models from proxy if using clauded
  if(process.env.ANTHROPIC_BASE_URL && process.env.ANTHROPIC_BASE_URL.includes('127.0.0.1:3000')){
    try{
      const{execSync}=require('child_process');
      const result=execSync('curl -s http://127.0.0.1:3000/v1/models',{
        encoding:'utf8',
        timeout:5000,
        stdio:['pipe','pipe','ignore']
      });
      const json=JSON.parse(result);
      if(json.data && Array.isArray(json.data)){
        global.__CLAUDED_PROXY_MODELS=json.data.map(m=>({
          value:m.id,
          label:m.display_name || m.name,
          description:''
        }));
      }
    }catch(e){
      // Silently fail if proxy unavailable or curl fails
    }
  }
})();
`;

// Remove old async fetcher if it exists
const lines = content.split('\n');
let startRemove = -1;
let endRemove = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// Fetch models from proxy if using clauded')) {
    startRemove = i - 1; // Include opening (function(){
    // Find closing })();
    for (let j = i; j < Math.min(i + 30, lines.length); j++) {
      if (lines[j].includes('})();')) {
        endRemove = j;
        break;
      }
    }
    break;
  }
}

if (startRemove !== -1 && endRemove !== -1) {
  lines.splice(startRemove, endRemove - startRemove + 1);
  console.log('✓ Removed old async fetcher code');
}

// Inject new sync fetcher at line 6 (after copyright and version)
lines.splice(5, 0, syncFetcherCode);
content = lines.join('\n');

// Create the patched RU3 function (same as before)
const patchedRU3 = `
function RU3(){
  // PATCHED: Use proxy models if available
  if(global.__CLAUDED_PROXY_MODELS && global.__CLAUDED_PROXY_MODELS.length>0){
    const models=[...global.__CLAUDED_PROXY_MODELS];
    // Mark first model as default
    if(models[0])models[0]={...models[0],label:'Default (recommended)'};
    return models;
  }

  // Fallback to original hardcoded models
  let A=LsQ;if(OB()){if(!DR())return[Fn(),QeA];if(yLA()||vLA()){let G=[Fn(),EsQ];if(Vn().hasAccess)G.push(HsQ);return G.push(QeA),G}if(ZeA()&&FJA())return[Fn(),EsQ,QeA];let B=[Fn(),OU3];if(Op1())B.push({value:"sonnet",label:"Sonnet",description:"Sonnet 4.5 with 200K context"});else if(Vn().hasAccess)B.push(HsQ);return B.push(QeA),B}let Q=[Fn(),wsQ()];if(a4()!=="firstParty")Q.push(NU3());if(Vn().hasAccess)Q.push(NsQ);if(A)Q.push(A);return Q
}`.trim();

// Replace RU3 function
content = content.replace(originalRU3, patchedRU3);

console.log('✓ Patched RU3() function to use proxy models');
console.log('✓ Injected SYNCHRONOUS model fetcher (blocks until loaded)');

// Write patched file
fs.writeFileSync(CLI_PATH, content);
console.log(`✓ Wrote patched CLI to ${CLI_PATH}`);

console.log('\n✅ Patch complete!');
console.log('\nChanges:');
console.log('  - Uses synchronous curl request to fetch models at startup');
console.log('  - Models are loaded BEFORE the REPL starts');
console.log('  - No more timing issues with /model picker');
console.log('  - 5 second timeout for fetch (falls back to default models)');
console.log('\nTest with: clauded');
console.log('Then run: /model');
console.log('\nYou should see all 15 models immediately!');
