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

function byteStreamResponse(chunks, rejectAfter = null) {
  let index = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader() {
        return {
          async read() {
            if (rejectAfter !== null && index === rejectAfter) throw new Error('socket closed');
            if (index >= chunks.length) return { done: true, value: undefined };
            return { done: false, value: Buffer.from(chunks[index++]) };
          },
        };
      },
    },
  };
}

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach((name) => this.values.add(name)); }
  remove(...names) { names.forEach((name) => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
}

class FakeNode {
  constructor(type = 'element') {
    this.type = type;
    this.children = [];
    this.parentNode = null;
    this.classList = new FakeClassList();
    this.className = '';
    this.attributes = new Map();
    this.removeCount = 0;
    this._text = '';
    this.style = {
      values: new Map(),
      setProperty: (name, value) => this.style.values.set(name, value),
    };
  }
  append(node) {
    node.parentNode = this;
    this.children.push(node);
  }
  replaceChildren(...nodes) {
    this.children.forEach((node) => { node.parentNode = null; });
    this.children = [];
    this._text = '';
    nodes.forEach((node) => this.append(node));
  }
  remove() {
    this.removeCount += 1;
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((node) => node !== this);
    this.parentNode = null;
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  get textContent() {
    if (this.type === 'text') return this._text;
    return this._text || this.children.map((node) => node.textContent).join('');
  }
  set textContent(value) {
    this.children.forEach((node) => { node.parentNode = null; });
    this.children = [];
    this._text = String(value);
  }
}

function createStageFixture(key) {
  const card = new FakeNode();
  const status = new FakeNode();
  const output = new FakeNode();
  const modelLabel = new FakeNode();
  const selectors = new Map([
    [`[data-stage="${key}"]`, card],
    [`[data-status="${key}"]`, status],
    [`[data-output="${key}"]`, output],
    [`[data-model-label="${key}"]`, modelLabel],
  ]);
  const document = {
    querySelector: (selector) => selectors.get(selector) || null,
    createElement: () => new FakeNode(),
    createTextNode: (text) => {
      const node = new FakeNode('text');
      node.textContent = text;
      return node;
    },
  };
  return { card, document, modelLabel, output, status };
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

test('the TinyLLM deliberation runs the required five-role roster and gives qwen every prior view', async () => {
  const runtime = loadRuntime();
  assert.equal(
    typeof runtime.runTinyDeliberation,
    'function',
    'Council runtime must export the TinyLLM five-role deliberation',
  );

  const controller = new AbortController();
  const calls = [];
  const outputs = {
    proposer: 'proposal from Tiny-Agent',
    analyst: 'analysis from llama',
    critic: 'critique from small qwen',
    observer: 'observation from EVE',
    synthesizer: 'synthesis from qwen',
  };

  const result = await runtime.runTinyDeliberation({
    proposition: 'Small models make their seams visible.',
    controller,
    async runSeat(seat, prompt, signal) {
      assert.equal(signal, controller.signal);
      calls.push({ role: seat.role, model: seat.model, prompt });
      return outputs[seat.key];
    },
  });

  assert.deepEqual(
    calls.map(({ role, model }) => ({ role, model })),
    [
      { role: 'proposer', model: 'hf.co/driaforall/Tiny-Agent-a-0.5B:latest' },
      { role: 'analyst', model: 'llama3.2:1b' },
      { role: 'critic', model: 'qwen2.5:0.5b' },
      {
        role: 'consciousness observer',
        model: 'hf.co/mradermacher/eve-qwen2.5-3b-consciousness-soul-GGUF:Q4_K_M',
      },
      { role: 'synthesizer', model: 'qwen2.5:3b' },
    ],
  );
  assert.deepEqual(result, {
    proposer: outputs.proposer,
    analyst: outputs.analyst,
    critic: outputs.critic,
    observer: outputs.observer,
    synthesizer: outputs.synthesizer,
  });

  const synthesisPrompt = calls.at(-1).prompt;
  assert.match(synthesisPrompt, /proposal from Tiny-Agent/);
  assert.match(synthesisPrompt, /analysis from llama/);
  assert.match(synthesisPrompt, /critique from small qwen/);
  assert.match(synthesisPrompt, /observation from EVE/);
});

test('the OpenRouter SSE parser drives safe token delivery from real data frames', async () => {
  const runtime = loadRuntime();
  assert.equal(typeof runtime.streamFreeModel, 'function', 'Council runtime must export its real SSE parser');

  const delivered = [];
  const text = await runtime.streamFreeModel(
    'example/model:free',
    [{ role: 'user', content: 'test' }],
    40,
    new AbortController().signal,
    (token) => delivered.push(token),
    { fetchImpl: async () => sseResponse('<em>real token</em>') },
  );

  assert.equal(text, '<em>real token</em>');
  assert.deepEqual(delivered, ['<em>real token</em>']);
});

test('model accents are deterministic FNV-1a HSL values', () => {
  const runtime = loadRuntime();
  assert.equal(typeof runtime.modelAccent, 'function', 'Council runtime must export deterministic model accents');

  assert.equal(runtime.modelAccent('qwen/qwen3-next-80b-a3b-instruct:free'), runtime.modelAccent('qwen/qwen3-next-80b-a3b-instruct:free'));
  assert.match(runtime.modelAccent('qwen/qwen3-next-80b-a3b-instruct:free'), /^hsl\(\d+ 65% 70%\)$/);
  assert.notEqual(runtime.modelAccent('qwen/qwen3-next-80b-a3b-instruct:free'), runtime.modelAccent('meta-llama/llama-3.3-70b-instruct:free'));
});

test('free relay failures become the promised public states', async () => {
  const runtime = loadRuntime();
  assert.equal(typeof runtime.streamFreeModel, 'function');
  const signal = new AbortController().signal;

  await assert.rejects(
    runtime.streamFreeModel('example/model:free', [], 40, signal, () => {}, {
      fetchImpl: async () => ({ ok: false, status: 429, body: null }),
    }),
    /The free OpenRouter roster is rate-limited right now\. No paid model was substituted\. Try again later\./,
  );
});

test('an interrupted partial OpenRouter stream is never presented as complete', async () => {
  const runtime = loadRuntime();
  const outer = new AbortController();
  let readCount = 0;

  await assert.rejects(
    runtime.streamFreeModel('example/model:free', [], 40, outer.signal, () => {}, {
      hardCap: 5,
      firstTokenTimeout: 100,
      fetchImpl: async (_url, options) => ({
        ok: true,
        status: 200,
        body: {
          getReader() {
            return {
              async read() {
                if (readCount++ === 0) {
                  return {
                    done: false,
                    value: Buffer.from(`data: ${JSON.stringify({ choices: [{ delta: { content: 'partial' } }] })}\n\n`),
                  };
                }
                return new Promise((_resolve, reject) => {
                  options.signal.addEventListener('abort', () => reject(abortError()), { once: true });
                });
              },
            };
          },
        },
      }),
    }),
    /The answer ended incomplete\./,
  );
});

test('OpenRouter requires [DONE] before a partial clean EOF can settle', async () => {
  const runtime = loadRuntime();
  const partial = `data: ${JSON.stringify({ choices: [{ delta: { content: 'partial' } }] })}\n\n`;
  await assert.rejects(
    runtime.streamFreeModel('example/model:free', [], 40, new AbortController().signal, () => {}, {
      fetchImpl: async () => byteStreamResponse([partial]),
    }),
    /The answer ended incomplete\./,
  );
});

test('OpenRouter reader rejection after a token is classified as incomplete', async () => {
  const runtime = loadRuntime();
  const partial = `data: ${JSON.stringify({ choices: [{ delta: { content: 'partial' } }] })}\n\n`;
  await assert.rejects(
    runtime.streamFreeModel('example/model:free', [], 40, new AbortController().signal, () => {}, {
      fetchImpl: async () => byteStreamResponse([partial], 1),
    }),
    /The answer ended incomplete\./,
  );
});

test('Tiny NDJSON requires an event.done terminal marker', async () => {
  const runtime = loadRuntime();
  assert.equal(typeof runtime.streamTinyModel, 'function', 'Council runtime must export its Tiny NDJSON parser');
  const partial = `${JSON.stringify({ response: 'partial', done: false })}\n`;
  await assert.rejects(
    runtime.streamTinyModel('tiny-model', 'prompt', 40, new AbortController().signal, () => {}, {
      fetchImpl: async () => byteStreamResponse([partial]),
    }),
    /The answer ended incomplete\./,
  );
});

test('Tiny reader rejection after a token is classified as incomplete', async () => {
  const runtime = loadRuntime();
  assert.equal(typeof runtime.streamTinyModel, 'function');
  const partial = `${JSON.stringify({ response: 'partial', done: false })}\n`;
  await assert.rejects(
    runtime.streamTinyModel('tiny-model', 'prompt', 40, new AbortController().signal, () => {}, {
      fetchImpl: async () => byteStreamResponse([partial], 1),
    }),
    /The answer ended incomplete\./,
  );
});

test('Tiny transport outage is normalized without leaking network errors', async () => {
  const runtime = loadRuntime();
  assert.equal(typeof runtime.streamTinyModel, 'function');
  await assert.rejects(
    runtime.streamTinyModel('tiny-model', 'prompt', 40, new AbortController().signal, () => {}, {
      fetchImpl: async () => { throw new Error('ECONNRESET private relay detail'); },
    }),
    /The Local Oracle is offline\. This page can only listen while Ivan’s ARM64 Ollama host and relay are reachable; no reply has been invented\./,
  );
});

test('the real stage lifecycle removes three dots once and renders hostile tokens literally', () => {
  const runtime = loadRuntime();
  assert.equal(typeof runtime.beginStage, 'function');
  assert.equal(typeof runtime.appendToken, 'function');
  assert.equal(typeof runtime.finishStage, 'function');

  const key = 'fixture-model';
  const fixture = createStageFixture(key);
  const previousDocument = global.document;
  global.document = fixture.document;
  try {
    const model = 'meta-llama/llama-3.3-70b-instruct:free';
    const stream = runtime.beginStage(key, 'Connecting', model);
    const loader = stream.loader;
    assert.equal(loader.children.length, 3);
    assert.equal(fixture.output.children.length, 2);
    assert.equal(fixture.modelLabel.textContent, model);

    const hostile = '<img src=x onerror="globalThis.pwned=true">';
    runtime.appendToken(stream, hostile);
    assert.equal(loader.removeCount, 1);
    assert.equal(stream.textNode.textContent, hostile);
    assert.equal(fixture.output.classList.contains('streaming'), true);

    runtime.appendToken(stream, ' tail');
    assert.equal(loader.removeCount, 1, 'the loader must only be removed for the first token');
    assert.equal(stream.textNode.textContent, `${hostile} tail`);

    runtime.finishStage(key, stream.text, 'Settled');
    assert.equal(fixture.output.textContent, `${hostile} tail`);
    assert.equal(fixture.output.classList.contains('streaming'), false);
    assert.equal(fixture.card.classList.contains('active'), false);
    assert.equal(fixture.card.classList.contains('done'), true);
  } finally {
    if (previousDocument === undefined) delete global.document;
    else global.document = previousDocument;
  }
});
