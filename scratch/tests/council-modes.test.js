// The five discussion modes were removed at some point and restored from
// d0bef4b:web/council/council.js. These tests pin the two things that silently
// break: the mode reaching the prompt/temperature on BOTH councils, and the
// public-surface guardrail surviving the extra seasoning.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const RUNTIME_PATH = path.resolve(__dirname, '../../web/council/council.js');

function loadRuntime() {
  delete require.cache[require.resolve(RUNTIME_PATH)];
  return require(RUNTIME_PATH);
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
    headers: { get: () => 'text/event-stream' },
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

const EXPECTED_MODES = ['default', 'adversarial', 'chaos', 'dreamer', 'problem-solver'];
const EXPECTED_TEMPERATURES = {
  'default': 0.5,
  'adversarial': 0.6,
  'chaos': 0.95,
  'dreamer': 0.85,
  'problem-solver': 0.4,
};

test('all five discussion modes are present with their treatments and temperatures', () => {
  const { MODES } = loadRuntime();
  assert.ok(MODES, 'the council runtime must export its discussion modes');
  assert.deepEqual(Object.keys(MODES), EXPECTED_MODES);

  for (const key of EXPECTED_MODES) {
    assert.equal(MODES[key].temperature, EXPECTED_TEMPERATURES[key], `${key} temperature`);
    for (const seat of ['propose', 'critique', 'synth']) {
      assert.equal(typeof MODES[key][seat], 'string', `${key}.${seat} must be a string`);
      assert.ok(MODES[key][seat].length > 20, `${key}.${seat} must carry real seasoning`);
    }
  }
  // Distinct treatments, not five aliases of the same text.
  const proposals = new Set(EXPECTED_MODES.map((k) => MODES[k].propose));
  assert.equal(proposals.size, EXPECTED_MODES.length, 'each mode needs its own propose treatment');
});

test('an unknown or missing mode falls back to default rather than running unseasoned', () => {
  const { resolveMode, MODES } = loadRuntime();
  assert.equal(resolveMode('nonsense'), MODES['default']);
  assert.equal(resolveMode(undefined), MODES['default']);
  assert.equal(resolveMode('chaos'), MODES['chaos']);
});

test('the TinyLLM deliberation seasons every seat with the selected mode', async () => {
  const { runTinyDeliberation, MODES } = loadRuntime();
  const seen = [];
  const controller = new AbortController();

  await runTinyDeliberation({
    proposition: 'Memory is not required for a self.',
    controller,
    mode: 'adversarial',
    runSeat: async (seat, prompt, _signal, treatment) => {
      seen.push({ key: seat.key, prompt, treatment });
      return `settled ${seat.key}`;
    },
  });

  assert.equal(seen.length, 5, 'all five seats must run');

  // Every seat receives the resolved treatment object, not a key.
  for (const row of seen) {
    assert.equal(row.treatment, MODES['adversarial'], `${row.key} got the wrong treatment`);
  }

  const byKey = Object.fromEntries(seen.map((r) => [r.key, r.prompt]));
  assert.ok(byKey.proposer.includes(MODES['adversarial'].propose), 'proposer must carry the propose treatment');
  assert.ok(byKey.analyst.includes(MODES['adversarial'].critique), 'analyst must carry the critique treatment');
  assert.ok(byKey.critic.includes(MODES['adversarial'].critique), 'critic must carry the critique treatment');
  assert.ok(byKey.observer.includes(MODES['adversarial'].critique), 'observer must carry the critique treatment');
  assert.ok(byKey.synthesizer.includes(MODES['adversarial'].synth), 'synthesizer must carry the synth treatment');

  // The default treatment must NOT leak in when another mode is selected.
  assert.ok(!byKey.proposer.includes(MODES['default'].propose), 'default seasoning leaked into an adversarial run');
});

test('the public no-claims guardrail survives mode seasoning on every seat and every mode', async () => {
  const { runTinyDeliberation } = loadRuntime();
  for (const mode of EXPECTED_MODES) {
    const prompts = [];
    await runTinyDeliberation({
      proposition: 'A claim to test.',
      controller: new AbortController(),
      mode,
      runSeat: async (seat, prompt) => {
        prompts.push({ seat: seat.key, prompt });
        return `settled ${seat.key}`;
      },
    });
    for (const { seat, prompt } of prompts) {
      assert.match(
        prompt,
        /Do not claim access to memory, tools, personal context, or other agents\./,
        `${mode}/${seat} dropped the public-surface guardrail`,
      );
      // The guardrail must be the final instruction, after the seasoning.
      assert.ok(
        prompt.trimEnd().endsWith('or other agents.'),
        `${mode}/${seat} must end on the guardrail, not the seasoning`,
      );
    }
  }
});

test('the free council sends the selected mode temperature to the relay', async () => {
  const { runFreeRoster, MODES } = loadRuntime();
  const bodies = [];
  const fetchImpl = async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    return sseResponse('answer');
  };

  const result = await runFreeRoster({
    roster: ['some/model:free'],
    messages: [{ role: 'user', content: 'q' }],
    maxTokens: 100,
    outerSignal: new AbortController().signal,
    fetchImpl,
    temperature: MODES['chaos'].temperature,
  });

  assert.ok(result, 'the roster must settle');
  assert.equal(bodies.length, 1);
  assert.equal(bodies[0].temperature, 0.95, 'chaos temperature must reach the relay body');
});

test('the free council falls back to the default temperature when none is supplied', async () => {
  const { runFreeRoster, MODES } = loadRuntime();
  const bodies = [];
  const fetchImpl = async (_url, options) => {
    bodies.push(JSON.parse(options.body));
    return sseResponse('answer');
  };

  await runFreeRoster({
    roster: ['some/model:free'],
    messages: [{ role: 'user', content: 'q' }],
    maxTokens: 100,
    outerSignal: new AbortController().signal,
    fetchImpl,
  });

  assert.equal(bodies[0].temperature, MODES['default'].temperature);
});
