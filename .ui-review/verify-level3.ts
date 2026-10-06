import assert from 'node:assert/strict';
import { generateAttemptPlan, validateLevel } from '../lib/game/engine';
import { generateAttemptPlan as before } from './level3-engine-before';

const matches = {Wifi:'CONNECT TO NETWORK', Shield:'PROTECT THE SYSTEM', Save:'STORE THE DATA'};
for(let seed=0;seed<200;seed++) {
  const old=before(seed), current=generateAttemptPlan(seed);
  for(const level of ['level1','level2','level4','masterKey'] as const) assert.deepEqual(current[level],old[level]);
  assert.deepEqual(Object.fromEntries(current.level3.techPairs.map(p=>[p.left,p.right])),matches);
  for(const mistakes of [0,1,2,3]){
    const result=validateLevel(3,seed,{matches,mistakes});
    assert.equal(result.passed,true);assert.equal(result.mistakes,mistakes);
  }
  assert.equal(validateLevel(3,seed,{matches:{...matches,Wifi:'STORE THE DATA'},mistakes:1}).passed,false);
  assert.equal(validateLevel(3,seed,{matches:{Wifi:matches.Wifi},mistakes:0}).passed,false);
}
console.log('200 seeds: exact Level 03 mappings and validation passed; Levels 01/02/04 and master key unchanged.');
