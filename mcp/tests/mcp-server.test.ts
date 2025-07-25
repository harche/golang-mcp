import assert from 'assert';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

function sendMcpRequest(proc: ChildProcessWithoutNullStreams, method: string, params: any, id = 1) {
  const msg = JSON.stringify({ jsonrpc: '2.0', method, params, id }) + '\n';
  proc.stdin.write(msg);
}

function waitForResponse(proc: ChildProcessWithoutNullStreams, id = 1, timeout = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    const onData = (chunk: Buffer) => {
      data += chunk.toString();
      try {
        const lines = data.split('\n').filter(Boolean);
        for (const line of lines) {
          const msg = JSON.parse(line);
          if (msg.id === id) {
            proc.stdout.off('data', onData);
            resolve(msg);
            return;
          }
        }
      } catch (e) {}
    };
    proc.stdout.on('data', onData);
    setTimeout(() => {
      proc.stdout.off('data', onData);
      reject(new Error('Timeout waiting for MCP response'));
    }, timeout);
  });
}

async function testListBuiltinFunctions() {
  const proc = spawn('node', ['dist/mcp.js'], { stdio: ['pipe', 'pipe', 'pipe'] }) as ChildProcessWithoutNullStreams;
  proc.stdout.on('data', chunk => process.stdout.write('[MCP STDOUT] ' + chunk.toString()));
  proc.stderr.on('data', chunk => process.stderr.write('[MCP STDERR] ' + chunk.toString()));
  // Wait for server to be ready (give it a moment to start)
  await new Promise(r => setTimeout(r, 1000));
  // Send a valid initialize message
  sendMcpRequest(proc, 'initialize', {
    protocolVersion: '2.0',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0.0' }
  }, 1);
  const initResp = await waitForResponse(proc, 1);
  console.log('Capabilities:', JSON.stringify(initResp, null, 2));

  // Use the correct MCP tool invocation format: tools/call
  sendMcpRequest(proc, 'tools/call', {
    name: 'list_builtin_functions',
    arguments: {}
  }, 2);
  const resp: any = await waitForResponse(proc, 2);
  assert(resp.result || resp.content, 'Should return a result/content');
  const text = (resp.result?.content?.[0]?.text || resp.content?.[0]?.text || '').toLowerCase();
  assert(text.includes('len'), 'Should mention len builtin');
  proc.kill();
}

async function testGetBuiltinFunction() {
  const proc = spawn('node', ['dist/mcp.js'], { stdio: ['pipe', 'pipe', 'pipe'] }) as ChildProcessWithoutNullStreams;
  proc.stdout.on('data', chunk => process.stdout.write('[MCP STDOUT] ' + chunk.toString()));
  proc.stderr.on('data', chunk => process.stderr.write('[MCP STDERR] ' + chunk.toString()));
  await new Promise(r => setTimeout(r, 1000));

  sendMcpRequest(proc, 'initialize', {
    protocolVersion: '2.0',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0.0' }
  }, 1);
  await waitForResponse(proc, 1);

  sendMcpRequest(proc, 'tools/call', {
    name: 'get_builtin_function',
    arguments: { function_name: 'len' }
  }, 2);
  const resp: any = await waitForResponse(proc, 2);
  assert(resp.result || resp.content, 'Should return a result/content');
  const text = (resp.result?.content?.[0]?.text || resp.content?.[0]?.text || '').toLowerCase();
  assert(text.includes('len'), 'Should mention len function');
  proc.kill();
}

async function testSearchStdLib() {
  const proc = spawn('node', ['dist/mcp.js'], { stdio: ['pipe', 'pipe', 'pipe'] }) as ChildProcessWithoutNullStreams;
  proc.stdout.on('data', chunk => process.stdout.write('[MCP STDOUT] ' + chunk.toString()));
  proc.stderr.on('data', chunk => process.stderr.write('[MCP STDERR] ' + chunk.toString()));
  await new Promise(r => setTimeout(r, 1000));

  sendMcpRequest(proc, 'initialize', {
    protocolVersion: '2.0',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0.0' }
  }, 1);
  await waitForResponse(proc, 1);

  sendMcpRequest(proc, 'tools/call', {
    name: 'search_std_lib',
    arguments: { query: 'fmt', limit: 5 }
  }, 2);
  const resp: any = await waitForResponse(proc, 2);
  assert(resp.result || resp.content, 'Should return a result/content');
  const text = (resp.result?.content?.[0]?.text || resp.content?.[0]?.text || '').toLowerCase();
  assert(text.includes('fmt'), 'Should mention fmt package');
  proc.kill();
}

async function testGetStdLibItem() {
  const proc = spawn('node', ['dist/mcp.js'], { stdio: ['pipe', 'pipe', 'pipe'] }) as ChildProcessWithoutNullStreams;
  proc.stdout.on('data', chunk => process.stdout.write('[MCP STDOUT] ' + chunk.toString()));
  proc.stderr.on('data', chunk => process.stderr.write('[MCP STDERR] ' + chunk.toString()));
  await new Promise(r => setTimeout(r, 1000));

  sendMcpRequest(proc, 'initialize', {
    protocolVersion: '2.0',
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0.0' }
  }, 1);
  await waitForResponse(proc, 1);

  sendMcpRequest(proc, 'tools/call', {
    name: 'get_std_lib_item',
    arguments: { name: 'fmt.Println' }
  }, 2);
  const resp: any = await waitForResponse(proc, 2);
  assert(resp.result || resp.content, 'Should return a result/content');
  const text = (resp.result?.content?.[0]?.text || resp.content?.[0]?.text || '').toLowerCase();
  assert(text.includes('println'), 'Should mention println function');
  proc.kill();
}

async function run() {
  console.log('Testing MCP server: list_builtin_functions...');
  await testListBuiltinFunctions();
  console.log('✓ MCP server: list_builtin_functions');

  console.log('Testing MCP server: get_builtin_function...');
  await testGetBuiltinFunction();
  console.log('✓ MCP server: get_builtin_function');

  console.log('Testing MCP server: search_std_lib...');
  await testSearchStdLib();
  console.log('✓ MCP server: search_std_lib');

  console.log('Testing MCP server: get_std_lib_item...');
  await testGetStdLibItem();
  console.log('✓ MCP server: get_std_lib_item');

  console.log('\n🎉 All MCP server integration tests passed!');
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});