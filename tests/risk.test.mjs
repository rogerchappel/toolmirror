import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { scanRisk } from '../dist/risk.js';

describe('scanRisk', () => {
  it('recognizes risky verbs in common tool identifier conventions', () => {
    for (const [name, verb] of [
      ['deleteFile', 'delete'],
      ['ExecuteCommand', 'execute'],
      ['sendEmail', 'send'],
      ['delete_file', 'delete'],
      ['execute-command', 'execute']
    ]) {
      const risk = scanRisk(name, '', []);
      assert.equal(risk.level, 'high', name);
      assert.deepEqual(risk.verbs, [verb], name);
    }
  });

  it('does not match risky verb substrings in benign compound identifiers', () => {
    for (const name of ['runtimeStatus', 'senderProfile', 'executeeDetails', 'updatedAt']) {
      assert.deepEqual(scanRisk(name, '', []), {
        level: 'low',
        reasons: ['no risky verbs or sensitive parameters detected'],
        verbs: []
      }, name);
    }
  });
});
