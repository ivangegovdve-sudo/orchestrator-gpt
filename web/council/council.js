(() => {
  'use strict';

  const TINY_RELAY = 'https://chloe.blumenkraft.cloud/tinylm-api';
  const OPEN_RELAY = 'https://chloe.blumenkraft.cloud/council/relay';
  const FIRST_TOKEN_TIMEOUT = 45_000;
  const STREAM_HARD_CAP = 120_000;

  const TINY_MINDS = {
    eve: {
      model: 'hf.co/mradermacher/eve-qwen2.5-3b-consciousness-soul-GGUF:Q4_K_M',
      maxTokens: 300,
      prompt(proposition) {
        return `Consider this proposition:\n\n"${proposition}"\n\nThink it through from your own perspective. What is true in it, what does it miss, and what does holding it feel like? Answer in a few short paragraphs.`;
      },
    },
    tiny: {
      model: 'hf.co/driaforall/Tiny-Agent-a-0.5B:latest',
      maxTokens: 250,
      prompt(proposition) {
        return `Consider this proposition:\n\n"${proposition}"\n\nAnalyze the core claim, the strongest argument for it, the strongest argument against it, and your verdict. Be concise.`;
      },
    },
  };

  const FREE_ROSTERS = {
    proposer: [
      'meta-llama/llama-3.3-70b-instruct:free',
      'qwen/qwen3-next-80b-a3b-instruct:free',
      'microsoft/phi-3-mini-128k-instruct:free',
    ],
    critic: [
      'openai/gpt-oss-20b:free',
      'google/gemma-4-31b-it:free',
      'nvidia/nemotron-3-nano-30b-a3b:free',
    ],
    synthesis: [
      'google/gemini-2.5-flash:free',
      'deepseek/deepseek-r1:free',
      'meta-llama/llama-3.3-70b-instruct:free',
    ],
  };

  const query = (selector) => document.querySelector(selector);
  const stageView = (key) => ({
    card: query(`[data-stage="${key}"]`) || query(`[data-synthesis="${key.replace('-synthesis', '')}"]`),
    status: query(`[data-status="${key}"]`),
    output: query(`[data-output="${key}"]`),
  });

  function abortError() {
    const error = new Error('Stopped');
    error.name = 'AbortError';
    return error;
  }

  function createStreamScope(outerSignal, options = {}) {
    const firstTokenTimeout = options.firstTokenTimeout ?? FIRST_TOKEN_TIMEOUT;
    const hardCap = options.hardCap ?? STREAM_HARD_CAP;
    const controller = new AbortController();
    let firstTokenSeen = false;
    let firstTokenExpired = false;
    let hardCapExpired = false;
    const stop = () => controller.abort();
    outerSignal.addEventListener('abort', stop, { once: true });
    const firstTimer = setTimeout(() => {
      firstTokenExpired = true;
      controller.abort();
    }, firstTokenTimeout);
    const hardTimer = setTimeout(() => {
      hardCapExpired = true;
      controller.abort();
    }, hardCap);

    return {
      signal: controller.signal,
      firstToken() {
        if (firstTokenSeen) return;
        firstTokenSeen = true;
        clearTimeout(firstTimer);
      },
      classify(error, partialText = '') {
        if (outerSignal.aborted) return abortError();
        if (firstTokenExpired && !firstTokenSeen) return new Error('No first token arrived before the free-run timeout.');
        if (hardCapExpired) {
          return partialText ? null : new Error('The model stream exceeded its hard time limit.');
        }
        return error;
      },
      close() {
        clearTimeout(firstTimer);
        clearTimeout(hardTimer);
        outerSignal.removeEventListener('abort', stop);
      },
    };
  }

  function createDeliberationLoader() {
    const loader = document.createElement('span');
    loader.className = 'deliberation-loader';
    loader.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < 3; index += 1) {
      const dot = document.createElement('span');
      dot.className = 'dot';
      loader.append(dot);
    }
    return loader;
  }

  function beginStage(key, label = 'Connecting') {
    const view = stageView(key);
    const textNode = document.createTextNode('');
    const loader = createDeliberationLoader();
    view.output.replaceChildren(textNode, loader);
    view.output.classList.remove('streaming');
    view.card.classList.remove('done');
    view.card.classList.add('active');
    view.status.textContent = label;
    view.status.classList.add('live');
    return { view, textNode, loader, text: '' };
  }

  function appendToken(stream, token) {
    if (!token) return;
    if (!stream.text) {
      stream.loader?.remove();
      stream.view.output.classList.add('streaming');
      stream.view.status.textContent = 'Streaming';
    }
    stream.text += token;
    stream.textNode.appendData(token);
  }

  function finishStage(key, text, label = 'Settled') {
    const view = stageView(key);
    view.output.classList.remove('streaming');
    if (text !== undefined) view.output.textContent = text || 'The model returned no text.';
    view.card.classList.remove('active');
    view.card.classList.add('done');
    view.status.textContent = label;
    view.status.classList.remove('live');
  }

  function failStage(key, message) {
    const view = stageView(key);
    view.output.classList.remove('streaming');
    view.output.textContent = message;
    view.card.classList.remove('active', 'done');
    view.status.textContent = 'Unavailable';
    view.status.classList.remove('live');
  }

  async function streamTinyModel(model, prompt, maxTokens, outerSignal, onToken) {
    const scope = createStreamScope(outerSignal);
    let fullText = '';
    try {
      let response;
      try {
        response = await fetch(`${TINY_RELAY}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt,
            stream: true,
            options: { num_predict: maxTokens, temperature: 0.8 },
          }),
          signal: scope.signal,
        });
      } catch (error) {
        throw scope.classify(error);
      }
      if (!response.ok || !response.body) throw new Error(`Local relay returned HTTP ${response.status}.`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        let chunk;
        try {
          chunk = await reader.read();
        } catch (error) {
          const classified = scope.classify(error, fullText);
          if (classified === null) return fullText;
          throw classified;
        }
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          let event;
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          if (event.error) throw new Error(String(event.error));
          if (event.response) {
            scope.firstToken();
            fullText += event.response;
            onToken(event.response);
          }
        }
      }
      if (buffer.trim()) {
        try {
          const finalEvent = JSON.parse(buffer);
          if (finalEvent.response) {
            scope.firstToken();
            fullText += finalEvent.response;
            onToken(finalEvent.response);
          }
        } catch {
          // An incomplete terminal line carries no usable token.
        }
      }
      return fullText.trim();
    } finally {
      scope.close();
    }
  }

  async function streamFreeModel(model, messages, maxTokens, outerSignal, onToken, transport = {}) {
    if (!model.endsWith(':free')) throw new Error('The public council blocked a non-free model.');
    const scope = createStreamScope(outerSignal, transport);
    const fetchImpl = transport.fetchImpl || fetch;
    let fullText = '';
    try {
      let response;
      try {
        response = await fetchImpl(OPEN_RELAY, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'HTTP-Referer': typeof location === 'undefined' ? 'https://sdforest.site' : location.origin,
            'X-Title': 'SDForest OpenRouter Free Council',
          },
          body: JSON.stringify({
            model,
            messages,
            stream: true,
            max_tokens: maxTokens,
            temperature: 0.55,
          }),
          signal: scope.signal,
        });
      } catch (error) {
        throw scope.classify(error);
      }
      if (!response.ok || !response.body) throw new Error(`Free relay returned HTTP ${response.status}.`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        let chunk;
        try {
          chunk = await reader.read();
        } catch (error) {
          const classified = scope.classify(error, fullText);
          if (classified === null) return fullText;
          throw classified;
        }
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line || line.startsWith(':') || !line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') return fullText.trim();
          let event;
          try {
            event = JSON.parse(payload);
          } catch {
            continue;
          }
          if (event.error) throw new Error(event.error.message || 'The free model stream failed.');
          const token = event.choices?.[0]?.delta?.content;
          if (token) {
            scope.firstToken();
            fullText += token;
            onToken(token);
          }
        }
      }
      return fullText.trim();
    } finally {
      scope.close();
    }
  }

  async function runFreeRoster(options) {
    const {
      roster,
      messages,
      maxTokens,
      outerSignal,
      fetchImpl,
      firstTokenTimeout,
      hardCap,
      onAttempt = () => {},
      onToken = () => {},
      onAttemptFailure = () => {},
    } = options;
    let lastError = null;
    for (let index = 0; index < roster.length; index += 1) {
      if (outerSignal.aborted) throw abortError();
      const model = roster[index];
      onAttempt(model, index, roster.length);
      try {
        const text = await streamFreeModel(
          model,
          messages,
          maxTokens,
          outerSignal,
          (token) => onToken(token, model, index),
          { fetchImpl, firstTokenTimeout, hardCap },
        );
        if (!text) throw new Error('The free model returned no text.');
        return { model, text };
      } catch (error) {
        if (outerSignal.aborted) throw abortError();
        lastError = error;
        onAttemptFailure(error, model, index);
      }
    }
    return null;
  }

  async function runFreeSeat(key, roster, messages, maxTokens, outerSignal, hint) {
    let stream = null;
    let lastError = null;
    const result = await runFreeRoster({
      roster,
      messages,
      maxTokens,
      outerSignal,
      onAttempt(model, index, count) {
        stream = beginStage(key, `Model ${index + 1}/${count}`);
        hint.textContent = `Trying ${model.split('/').pop()} — free-tier queues can vary.`;
      },
      onToken(token) {
        appendToken(stream, token);
      },
      onAttemptFailure(error) {
        lastError = error;
      },
    });
    if (result) {
      finishStage(key, result.text, result.model.split('/').pop());
      return result;
    }
    failStage(key, `Every fixed free-model fallback was unavailable. ${lastError?.message || ''}`.trim());
    return null;
  }

  async function runTinyPair(controller, jobs) {
    let primaryFailure = null;
    const guardedJobs = jobs.map((job) => Promise.resolve()
      .then(() => job(controller.signal))
      .catch((error) => {
        if (!primaryFailure) primaryFailure = error;
        if (!controller.signal.aborted) controller.abort();
        throw error;
      }));
    const results = await Promise.allSettled(guardedJobs);
    if (primaryFailure) throw primaryFailure;
    return results.map((result) => result.value);
  }

  let tinyController = null;
  async function runTinyCouncil() {
    if (tinyController) {
      tinyController.abort();
      return;
    }
    const prompt = query('#tinylm-prompt');
    const proposition = prompt.value.trim();
    if (!proposition) {
      prompt.focus();
      return;
    }

    const runButton = query('#tinylm-run');
    const hint = query('#tinylm-hint');
    const synthesis = query('[data-synthesis="tinylm"]');
    tinyController = new AbortController();
    const { signal } = tinyController;
    runButton.textContent = 'Stop local run';
    runButton.classList.add('running');
    hint.textContent = 'Both local minds are running in parallel.';
    synthesis.classList.remove('visible');

    const runMind = async (mindKey, stageKey) => {
      const stream = beginStage(stageKey);
      try {
        const mind = TINY_MINDS[mindKey];
        const text = await streamTinyModel(
          mind.model,
          mind.prompt(proposition),
          mind.maxTokens,
          signal,
          (token) => appendToken(stream, token),
        );
        finishStage(stageKey, text);
        return text;
      } catch (error) {
        if (error.name === 'AbortError') {
          failStage(stageKey, 'Run stopped.');
          throw error;
        }
        failStage(stageKey, error.message);
        throw error;
      }
    };

    try {
      const [eveText, tinyText] = await runTinyPair(tinyController, [
        () => runMind('eve', 'tinylm-eve'),
        () => runMind('tiny', 'tinylm-tiny'),
      ]);
      if (signal.aborted) throw abortError();

      synthesis.classList.add('visible');
      const synthStream = beginStage('tinylm-synthesis', 'Reading both');
      const synthesisPrompt =
        `Two small models considered: "${proposition}".\n\n` +
        `EVE said:\n${eveText.slice(0, 1100)}\n\n` +
        `Tiny-Agent said:\n${tinyText.slice(0, 1100)}\n\n` +
        'In 3 to 5 sentences, identify their strongest agreement and clearest divergence.';
      const synthesisText = await streamTinyModel(
        TINY_MINDS.tiny.model,
        synthesisPrompt,
        220,
        signal,
        (token) => appendToken(synthStream, token),
      );
      finishStage('tinylm-synthesis', synthesisText);
      hint.textContent = 'Local deliberation complete. Nothing was saved by this page.';
    } catch (error) {
      hint.textContent = error.name === 'AbortError'
        ? 'Local deliberation stopped.'
        : `Local deliberation ended early: ${error.message}`;
    } finally {
      tinyController = null;
      runButton.textContent = 'Begin local deliberation';
      runButton.classList.remove('running');
    }
  }

  let openController = null;
  async function runOpenCouncil() {
    if (openController) {
      openController.abort();
      return;
    }
    const input = query('#openrouter-question');
    const question = input.value.trim();
    if (!question) {
      input.focus();
      return;
    }

    const runButton = query('#openrouter-run');
    const hint = query('#openrouter-hint');
    openController = new AbortController();
    const { signal } = openController;
    runButton.textContent = 'Stop free council';
    runButton.classList.add('running');

    try {
      const proposer = await runFreeSeat(
        'openrouter-proposer',
        FREE_ROSTERS.proposer,
        [
          { role: 'system', content: 'You are the Proposer in a stateless public model council. Give a direct position, its reasoning, and the most important trade-off. Do not claim access to user history, memory, tools, or other agents.' },
          { role: 'user', content: question },
        ],
        700,
        signal,
        hint,
      );
      if (!proposer) throw new Error('The Proposer roster is currently unavailable.');

      const critic = await runFreeSeat(
        'openrouter-critic',
        FREE_ROSTERS.critic,
        [
          { role: 'system', content: 'You are the Critic in a stateless public model council. Stress-test the proposal fairly. Identify assumptions, failure modes, and the strongest opposing argument. Do not claim access to user history, memory, tools, or other agents.' },
          { role: 'user', content: `Question:\n${question}\n\nProposal:\n${proposer.text}` },
        ],
        600,
        signal,
        hint,
      );

      const synthesis = await runFreeSeat(
        'openrouter-synthesis',
        FREE_ROSTERS.synthesis,
        [
          { role: 'system', content: 'You are the Synthesizer in a stateless public model council. Weigh what survives the critique and produce one concise practical answer with a clear next step. Do not claim access to user history, memory, tools, or other agents.' },
          {
            role: 'user',
            content:
              `Question:\n${question}\n\nProposal:\n${proposer.text}\n\n` +
              `Critique:\n${critic?.text || 'The critic roster was unavailable; explicitly lower confidence.'}`,
          },
        ],
        850,
        signal,
        hint,
      );
      if (!synthesis) throw new Error('The synthesis roster is currently unavailable.');
      hint.textContent = 'Free council complete. Nothing was saved by this page.';
    } catch (error) {
      hint.textContent = error.name === 'AbortError'
        ? 'Free council stopped.'
        : `Free council ended early: ${error.message}`;
    } finally {
      openController = null;
      runButton.textContent = 'Convene free council';
      runButton.classList.remove('running');
    }
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = { runFreeRoster, runTinyPair };
  }
  if (typeof document === 'undefined') return;

  for (const button of document.querySelectorAll('[data-fill]')) {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.fill);
      target.value = button.textContent.trim();
      target.focus();
    });
  }

  query('#tinylm-run').addEventListener('click', runTinyCouncil);
  query('#openrouter-run').addEventListener('click', runOpenCouncil);
  query('#tinylm-prompt').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) runTinyCouncil();
  });
  query('#openrouter-question').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) runOpenCouncil();
  });
})();
