const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const RUNTIME_PATH = path.resolve(__dirname, '../../web/council/council.js');

function loadRuntime() {
  try {
    delete require.cache[require.resolve(RUNTIME_PATH)];
    return require(RUNTIME_PATH);
  } catch {
    return {};
  }
}

function abortError() {
  const error = new Error('transport aborted');
  error.name = 'AbortError';
  return error;
}

function sseResponse(text) {
  const chunks = [
    Buffer.from(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`),
    Buffer.from('data: [DONE]\n\n'),
  ];
  let index = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader() {
        return {
          async read() {
            if (index >= chunks.length) return { done: true, value: undefined };
            return { done: false, value: chunks[index++] };
          },
        };
      },
    },
  };
}

test('a pre-header timeout advances to the next fixed free model', async () => {
  const runtime = loadRuntime();
  assert.equal(typeof runtime.runFreeRoster, 'function', 'Council runtime must export its roster behavior');

  const attempts = [];
  const fetchImpl = async (_url, options) => {
    const model = JSON.parse(options.body).model;
    attempts.push(model);
    if (attempts.length === 1) {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(abortError()), { once: true });
      });
    }
    return sseResponse('fallback answer');
  };

  const outer = new AbortController();
  const result = await runtime.runFreeRoster({
    roster: ['first/model:free', 'second/model:free'],
    messages: [{ role: 'user', content: 'test' }],
    maxTokens: 40,
    outerSignal: outer.signal,
    fetchImpl,
    firstTokenTimeout: 5,
    hardCap: 100,
  });

  assert.deepEqual(attempts, ['first/model:free', 'second/model:free']);
  assert.equal(result.model, 'second/model:free');
  assert.equal(result.text, 'fallback answer');
  assert.equal(outer.signal.aborted, false, 'transport timeout must not masquerade as a user abort');
});

test('a TinyLLM mind failure aborts and settles its sibling before returning', async () => {
  const runtime = loadRuntime();
  assert.equal(typeof runtime.runTinyPair, 'function', 'Council runtime must export its TinyLLM pair barrier');

  const controller = new AbortController();
  let siblingSettled = false;
  let lateWrites = 0;

  const failingMind = async () => {
    await Promise.resolve();
    throw new Error('mind failed');
  };
  const siblingMind = (signal) => new Promise((resolve, reject) => {
    const lateWrite = setTimeout(() => {
      lateWrites += 1;
      resolve('late output');
    }, 40);
    signal.addEventListener('abort', () => {
      clearTimeout(lateWrite);
      siblingSettled = true;
      reject(abortError());
    }, { once: true });
  });

  await assert.rejects(
    runtime.runTinyPair(controller, [failingMind, siblingMind]),
    /mind failed/,
  );
  assert.equal(controller.signal.aborted, true);
  assert.equal(siblingSettled, true, 'the sibling must finish abort cleanup before the pair rejects');

  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(lateWrites, 0, 'a failed prior run must not keep writing after a new run could start');
});
