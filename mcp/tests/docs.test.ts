import assert from 'assert';
import { downloadSourcesTar } from '../docs.js';
import extractBuiltinFunctions from '../extract-builtin-functions.js';

async function testDownloadSourcesTar() {
  // Should succeed for a real version (if network is available)
  const data = await downloadSourcesTar('1.21.0', true);
  assert(data.length > 10000, 'Should download a non-trivial tarball for a real Go version');

  // Should fallback for a fake version
  const fake = await downloadSourcesTar('0.0.0', true);
  assert(fake.length > 0, 'Should create a minimal file for a fake Go version');
  const text = new TextDecoder().decode(fake);
  assert(text.includes('builtinFunctions'), 'Fallback file should mention builtinFunctions');
}

async function testExtractBuiltinFunctions() {
  const builtins = await extractBuiltinFunctions('1.21.0', true);
  assert(Array.isArray(builtins), 'Should return an array');
  assert(builtins.some(fn => fn.func === 'len'), 'Should include len builtin');
}

async function run() {
  console.log('Testing downloadSourcesTar...');
  await testDownloadSourcesTar();
  console.log('✓ downloadSourcesTar');

  console.log('Testing extractBuiltinFunctions...');
  await testExtractBuiltinFunctions();
  console.log('✓ extractBuiltinFunctions');

  // More integration tests can be added here
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});