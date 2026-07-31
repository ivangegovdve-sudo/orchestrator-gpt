(() => {
  'use strict';

  const TINY_RELAY = 'https://chloe.blumenkraft.cloud/tinylm-api';
  const OPEN_RELAY = 'https://chloe.blumenkraft.cloud/council/relay';
  const FIRST_TOKEN_TIMEOUT = 45_000;
  const STREAM_HARD_CAP = 120_000;

  const TINY_ROSTER = [
    {
      key: 'proposer',
      role: 'proposer',
      stageKey: 'tinylm-proposer',
      label: 'Tiny-Agent',
      model: 'hf.co/driaforall/Tiny-Agent-a-0.5B:latest',
      maxTokens: 260,
      prompt(proposition) {
        return `You are the proposer in a five-role, stateless public council.\n\nProposition:\n"${proposition}"\n\nState a direct position, give the strongest reason for it, and name the central trade-off. Be concise. Do not claim access to memory, tools, personal context, or other agents.`;
      },
    },
    {
      key: 'analyst',
      role: 'analyst',
      stageKey: 'tinylm-analyst',
      label: 'llama3.2:1b',
      model: 'llama3.2:1b',
      maxTokens: 300,
      prompt(proposition, outputs) {
        return `You are the analyst in a five-role, stateless public council.\n\nProposition:\n"${proposition}"\n\nTiny-Agent proposal:\n${outputs.proposer.slice(0, 1400)}\n\nBreak the claim into assumptions, evidence needs, and likely consequences. Do not claim access to memory, tools, personal context, or other agents.`;
      },
    },
    {
      key: 'critic',
      role: 'critic',
      stageKey: 'tinylm-critic',
      label: 'qwen2.5:0.5b',
      model: 'qwen2.5:0.5b',
      maxTokens: 280,
      prompt(proposition, outputs) {
        return `You are the critic in a five-role, stateless public council.\n\nProposition:\n"${proposition}"\n\nTiny-Agent proposal:\n${outputs.proposer.slice(0, 1400)}\n\nStress-test the proposal fairly. Identify its weakest assumption, strongest counterargument, and one failure mode. Do not claim access to memory, tools, personal context, or other agents.`;
      },
    },
    {
      key: 'observer',
      role: 'consciousness observer',
      stageKey: 'tinylm-observer',
      label: 'EVE',
      model: 'hf.co/mradermacher/eve-qwen2.5-3b-consciousness-soul-GGUF:Q4_K_M',
      maxTokens: 300,
      prompt(proposition, outputs) {
        return `You are the consciousness observer in a five-role, stateless public council.\n\nProposition:\n"${proposition}"\n\nTiny-Agent proposal:\n${outputs.proposer.slice(0, 1400)}\n\nObserve how the proposal frames agency, perspective, uncertainty, and selfhood. Distinguish observation from fact. Do not claim access to memory, tools, personal context, or other agents.`;
      },
    },
    {
      key: 'synthesizer',
      role: 'synthesizer',
      stageKey: 'tinylm-synthesizer',
      label: 'qwen',
      model: 'qwen2.5:3b',
      maxTokens: 360,
      prompt(proposition, outputs) {
        return `You are the synthesizer in a five-role, stateless public council.\n\nProposition:\n"${proposition}"\n\nTiny-Agent proposer:\n${outputs.proposer.slice(0, 1200)}\n\nllama3.2:1b analyst:\n${outputs.analyst.slice(0, 1200)}\n\nqwen2.5:0.5b critic:\n${outputs.critic.slice(0, 1200)}\n\nEVE consciousness observer:\n${outputs.observer.slice(0, 1200)}\n\nProduce one concise synthesis: what survives, what remains uncertain, and the clearest next question. Do not claim access to memory, tools, personal context, or other agents.`;
      },
    },
  ];

  // Free slugs get retired without notice — a dead roster reads to the visitor as a
  // broken page. Every entry below was verified live through OPEN_RELAY on 2026-07-30.
  const FREE_ROSTERS = {
    proposer: [
      'nvidia/nemotron-3-super-120b-a12b:free',
      'google/gemma-4-26b-a4b-it:free',
      'openai/gpt-oss-20b:free',
    ],
    critic: [
      'openai/gpt-oss-20b:free',
      'nvidia/nemotron-3-nano-30b-a3b:free',
      'inclusionai/ling-3.0-flash:free',
    ],
    synthesis: [
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'google/gemma-4-26b-a4b-it:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
    ],
  };

  const query = (selector) => document.querySelector(selector);
  const NULL_NODE = { textContent: '', classList: { add() {}, remove() {} }, replaceChildren() {}, setAttribute() {} };
  // A missing card must not take the whole run down with it.
  const stageView = (key) => ({
    card: query(`[data-stage="${key}"]`) || NULL_NODE,
    status: query(`[data-status="${key}"]`) || NULL_NODE,
    output: query(`[data-output="${key}"]`) || NULL_NODE,
  });

  function abortError() {
    const error = new Error('Stopped');
    error.name = 'AbortError';
    return error;
  }

  // A browser reports a blocked, refused, or DNS-dead request as a bare
  // "Failed to fetch" TypeError. That string is meaningless to a visitor, so every
  // failure gets tagged at its source and translated once, here.
  const TRANSPORT_NOISE = /failed to fetch|networkerror|load failed|network request failed|connection (refused|closed|reset)/i;

  function tagFailure(error, kind, status) {
    if (!error || error.name === 'AbortError' || error.kind) return error;
    error.kind = kind;
    if (status !== undefined) error.status = status;
    return error;
  }

  function transportFailure(error) {
    if (!error || error.name === 'AbortError') return error;
    if (error.kind) return error;
    const looksLikeTransport = error instanceof TypeError || TRANSPORT_NOISE.test(error.message || '');
    return tagFailure(error, looksLikeTransport ? 'transport' : 'stream');
  }

  const HOST_DOWN_STATUS = new Set([502, 503, 504, 521, 522, 523, 524]);

  // Returns the badge shown on the seat card and the one line that replaces the
  // card body. Nothing raw from the network ever reaches either.
  function describeFailure(error, mode) {
    if (!error) return { badge: 'Unavailable', message: 'This seat did not return an answer.' };
    const local = mode === 'tinylm';

    if (error.kind === 'timeout-first-token') {
      return {
        badge: 'Timed out',
        message: local
          ? 'The model did not begin answering in time. Tiny models are slow to load on a cold start.'
          : 'No free provider began answering in time.',
      };
    }
    if (error.kind === 'timeout-hard-cap') {
      return { badge: 'Timed out', message: 'The answer ran past this council’s time limit and was cut short.' };
    }
    if (error.kind === 'transport') {
      return {
        badge: 'Offline',
        message: local
          ? 'The machine hosting the tiny models is not answering right now.'
          : 'The free-model relay is unreachable from this device right now.',
      };
    }
    if (error.kind === 'http') {
      if (HOST_DOWN_STATUS.has(error.status)) {
        return {
          badge: 'Offline',
          message: local
            ? 'The relay is up but the machine hosting the tiny models is not answering.'
            : 'The free-model relay is temporarily down.',
        };
      }
      if (error.status === 429) {
        return { badge: 'Busy', message: 'The free tier is rate-limited right now. Try again in a few minutes.' };
      }
      return { badge: 'Unavailable', message: 'The relay could not serve this seat.' };
    }
    if (error.kind === 'empty') {
      return { badge: 'No answer', message: 'The model connected but returned no text.' };
    }
    return { badge: 'Unavailable', message: 'This seat could not complete its turn.' };
  }

  // The sentence under the composer. It has to tell the visitor what to do next,
  // not restate the failure.
  function describeRunFailure(error, mode) {
    const { badge } = describeFailure(error, mode);
    if (mode === 'tinylm') {
      if (badge === 'Offline') {
        return 'The local Oracle council is offline — the tiny models run on hardware that is not answering right now. The OpenRouter Free council below runs entirely in the cloud and is available.';
      }
      if (badge === 'Busy' || badge === 'Timed out') {
        return 'The local council ran out of time before it settled. Tiny models are slow on a cold start — try again, or use the OpenRouter Free council below.';
      }
      return 'The local council could not finish this run. The OpenRouter Free council below is an independent path to the same question.';
    }
    if (badge === 'Offline') {
      return 'The free-model relay is unreachable from this device right now. Nothing was sent and nothing was saved.';
    }
    if (badge === 'Busy') {
      return 'Every free model in the roster is rate-limited right now. Free-tier queues clear on their own — try again shortly.';
    }
    return 'The free council could not finish this run. No paid model was substituted.';
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
        if (firstTokenExpired && !firstTokenSeen) {
          return tagFailure(new Error('No first token arrived before the free-run timeout.'), 'timeout-first-token');
        }
        if (hardCapExpired) {
          return partialText
            ? null
            : tagFailure(new Error('The model stream exceeded its hard time limit.'), 'timeout-hard-cap');
        }
        return transportFailure(error);
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
    view.card.classList.remove('done', 'quiet');
    view.card.classList.add('active');
    view.status.textContent = label;
    view.status.classList.add('live');
    view.status.classList.remove('quiet');
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
    view.card.classList.remove('active', 'quiet');
    view.card.classList.add('done');
    view.status.textContent = label;
    view.status.classList.remove('live', 'quiet');
  }

  // `quiet` collapses the card body so a one-line failure does not sit inside a
  // 260px empty panel — the seat stays visible, its dead space does not.
  function restStage(key, badge, message) {
    const view = stageView(key);
    view.output.classList.remove('streaming');
    view.output.textContent = message;
    view.card.classList.remove('active', 'done');
    view.card.classList.add('quiet');
    view.status.textContent = badge;
    view.status.classList.remove('live');
    view.status.classList.add('quiet');
  }

  function failStage(key, error, mode) {
    const { badge, message } = describeFailure(error, mode);
    restStage(key, badge, message);
  }

  // Seats that never got their turn because an earlier seat died.
  function skipStage(key) {
    restStage(key, 'Not run', 'This seat never opened — the run ended before its turn.');
  }

  // The idle copy each card ships with, captured before any run can overwrite it.
  const IDLE_COPY = new Map();
  function rememberIdleCopy(keys) {
    for (const key of keys) {
      if (!IDLE_COPY.has(key)) IDLE_COPY.set(key, stageView(key).output.textContent || '');
    }
  }

  // A new run must not inherit the previous run's failures — otherwise a seat that
  // has not had its turn yet still reads "Offline" from ten minutes ago.
  function resetStages(keys) {
    for (const key of keys) {
      const view = stageView(key);
      view.output.classList.remove('streaming');
      view.output.textContent = IDLE_COPY.get(key) ?? '';
      view.card.classList.remove('active', 'done', 'quiet');
      view.status.textContent = 'Waiting';
      view.status.classList.remove('live', 'quiet');
    }
  }

  const TINY_STAGE_KEYS = TINY_ROSTER.map((seat) => seat.stageKey);
  const FREE_STAGE_KEYS = ['openrouter-proposer', 'openrouter-critic', 'openrouter-synthesis'];

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
      if (!response.ok || !response.body) {
        throw tagFailure(new Error(`Local relay returned HTTP ${response.status}.`), 'http', response.status);
      }

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
        // Only Content-Type may be sent from the browser. The relay's CORS policy
        // allows a fixed header set, and any extra custom header (this once carried
        // HTTP-Referer and X-Title) fails preflight with "Disallowed CORS headers",
        // which the browser surfaces as a bare "Failed to fetch". OpenRouter
        // attribution belongs on the relay, which holds the key anyway.
        response = await fetchImpl(OPEN_RELAY, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      if (!response.ok || !response.body) {
        throw tagFailure(new Error(`Free relay returned HTTP ${response.status}.`), 'http', response.status);
      }
      // A retired or rate-limited slug comes back as a JSON body with HTTP 200 rather
      // than an SSE stream. Left unread it would look like an empty answer.
      if ((response.headers?.get?.('content-type') || '').includes('application/json')) {
        const detail = await response.json().catch(() => null);
        const code = detail?.error?.code;
        throw tagFailure(
          new Error(detail?.error?.message || 'The free relay refused this model.'),
          'http',
          typeof code === 'number' ? code : undefined,
        );
      }

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
        if (!text) throw tagFailure(new Error('The free model returned no text.'), 'empty');
        return { model, text };
      } catch (error) {
        if (outerSignal.aborted) throw abortError();
        lastError = error;
        onAttemptFailure(error, model, index);
      }
    }
    return null;
  }

  async function runFreeSeat(key, roster, messages, maxTokens, outerSignal, hint, runState = {}) {
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
    runState.lastFailure = lastError;
    failStage(key, lastError, 'openrouter');
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

  async function runTinyDeliberation({ proposition, controller, runSeat }) {
    const claim = String(proposition || '').trim();
    if (!claim) throw new Error('A proposition is required.');
    if (!controller?.signal || typeof runSeat !== 'function') {
      throw new TypeError('TinyLLM deliberation requires an abort controller and seat runner.');
    }

    const outputs = {};
    const invokeSeat = async (seat, signal = controller.signal) => {
      if (signal.aborted) throw abortError();
      const prompt = seat.prompt(claim, outputs);
      const text = await runSeat(seat, prompt, signal);
      if (signal.aborted) throw abortError();
      const settledText = typeof text === 'string' ? text.trim() : '';
      if (!settledText) throw new Error(`${seat.label} returned no text.`);
      outputs[seat.key] = settledText;
      return settledText;
    };

    await invokeSeat(TINY_ROSTER[0]);
    await runTinyPair(
      controller,
      TINY_ROSTER.slice(1, 4).map((seat) => (signal) => invokeSeat(seat, signal)),
    );
    await invokeSeat(TINY_ROSTER[4]);
    return outputs;
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
    resetStages(TINY_STAGE_KEYS);
    tinyController = new AbortController();
    runButton.textContent = 'Stop local run';
    runButton.classList.add('running');
    hint.textContent = 'Tiny-Agent is opening the five-role deliberation.';

    const opened = new Set();
    const runSeat = async (seat, seatPrompt, signal) => {
      opened.add(seat.stageKey);
      const stream = beginStage(
        seat.stageKey,
        seat.key === 'synthesizer' ? 'Reading council' : 'Connecting',
      );
      hint.textContent = seat.key === 'synthesizer'
        ? 'qwen is weighing all four prior views.'
        : `${seat.label} is serving as ${seat.role}.`;
      try {
        const text = await streamTinyModel(
          seat.model,
          seatPrompt,
          seat.maxTokens,
          signal,
          (token) => appendToken(stream, token),
        );
        finishStage(seat.stageKey, text, seat.label);
        return text;
      } catch (error) {
        if (error.name === 'AbortError') {
          restStage(seat.stageKey, 'Stopped', 'This run was stopped before the seat answered.');
        } else {
          failStage(seat.stageKey, error, 'tinylm');
        }
        throw error;
      }
    };

    try {
      await runTinyDeliberation({
        proposition,
        controller: tinyController,
        runSeat,
      });
      hint.textContent = 'Local deliberation complete. Nothing was saved by this page.';
    } catch (error) {
      const stopped = error.name === 'AbortError';
      for (const seat of TINY_ROSTER) {
        if (!opened.has(seat.stageKey)) {
          if (stopped) restStage(seat.stageKey, 'Stopped', 'This run was stopped before the seat opened.');
          else skipStage(seat.stageKey);
        }
      }
      hint.textContent = stopped
        ? 'Local deliberation stopped. Nothing was saved by this page.'
        : describeRunFailure(error, 'tinylm');
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
    resetStages(FREE_STAGE_KEYS);
    openController = new AbortController();
    const { signal } = openController;
    runButton.textContent = 'Stop free council';
    runButton.classList.add('running');

    const runState = {};
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
        runState,
      );
      if (!proposer) {
        skipStage('openrouter-critic');
        skipStage('openrouter-synthesis');
        throw runState.lastFailure || new Error('The Proposer roster is currently unavailable.');
      }

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
        runState,
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
        runState,
      );
      if (!synthesis) {
        throw runState.lastFailure || new Error('The synthesis roster is currently unavailable.');
      }
      hint.textContent = critic
        ? 'Free council complete. Nothing was saved by this page.'
        : 'Free council complete without a critic seat — weigh the synthesis with lower confidence. Nothing was saved by this page.';
    } catch (error) {
      const stopped = error.name === 'AbortError';
      // A seat aborted mid-stream would otherwise keep its live "Streaming" badge.
      for (const key of FREE_STAGE_KEYS) {
        if (stageView(key).card.classList?.contains?.('active')) {
          restStage(key, stopped ? 'Stopped' : 'Unavailable', stopped
            ? 'This run was stopped before the seat settled.'
            : 'This seat could not complete its turn.');
        }
      }
      hint.textContent = stopped
        ? 'Free council stopped. Nothing was saved by this page.'
        : describeRunFailure(error, 'openrouter');
    } finally {
      openController = null;
      runButton.textContent = 'Convene free council';
      runButton.classList.remove('running');
    }
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = { runFreeRoster, runTinyPair, runTinyDeliberation };
  }
  if (typeof document === 'undefined') return;

  // Each wiring step is independent: a control that fails to bind must not silently
  // strip the listeners from the controls after it.
  function bind(description, wire) {
    try {
      wire();
    } catch (error) {
      console.warn(`Council: ${description} could not be wired.`, error);
    }
  }

  bind('idle card copy', () => rememberIdleCopy([...TINY_STAGE_KEYS, ...FREE_STAGE_KEYS]));

  bind('example fills', () => {
    for (const button of document.querySelectorAll('[data-fill]')) {
      button.addEventListener('click', () => {
        const target = document.getElementById(button.dataset.fill);
        if (!target) return;
        target.value = button.textContent.trim();
        target.focus();
      });
    }
  });

  // A run handler must never leak an unhandled rejection into the console.
  const guard = (run) => () => {
    Promise.resolve()
      .then(run)
      .catch((error) => console.warn('Council: a run ended unexpectedly.', error));
  };
  const runTiny = guard(runTinyCouncil);
  const runOpen = guard(runOpenCouncil);

  bind('local run button', () => query('#tinylm-run').addEventListener('click', runTiny));
  bind('free run button', () => query('#openrouter-run').addEventListener('click', runOpen));
  bind('local shortcut', () => query('#tinylm-prompt').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) runTiny();
  }));
  bind('free shortcut', () => query('#openrouter-question').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) runOpen();
  }));
})();
