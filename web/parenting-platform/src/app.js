import {
  AGE_BANDS,
  EVIDENCE_ENTRIES,
  METRICS,
  PRACTICE_WEEKS,
  PRODUCT_GUARDRAILS,
  SAFEGUARDING,
  SCENARIOS,
  STEP_DEFINITIONS,
  getScenario,
  getScenarioAgeContent,
} from './content.js';
import {
  STORAGE_KEY,
  clearStoredCheckIns,
  describeCheckIns,
  loadCheckIns,
  storeCheckIns,
  validateCheckIn,
} from './tracker.js';
import { buildScenarioSummary, requestScenarioPrint } from './summary.js';

const STEP_SHORT_LABELS = ['Safety', 'Regulate', 'Connect', 'Limit', 'Alternative', 'Co-regulate', 'Repair'];
const VALID_VIEWS = new Set(['guide', 'check-in', 'evidence', 'about']);

const FIELD_CONFIG = {
  frequency: {
    kind: 'number',
    integer: true,
    min: 0,
    max: 999,
    step: 1,
    placeholder: 'e.g. 4',
    help: 'Count observed episodes. Do not estimate an unrecorded week as zero.',
  },
  severity: {
    kind: 'select',
    min: 1,
    max: 5,
    options: [
      [1, '1 — lowest intensity for your family'],
      [2, '2'],
      [3, '3 — middle'],
      [4, '4'],
      [5, '5 — highest intensity for your family'],
    ],
    help: 'A personal 1–5 rating, not a validated clinical score.',
  },
  'recovery-time': {
    kind: 'number',
    integer: true,
    min: 0,
    max: 1440,
    step: 1,
    placeholder: 'e.g. 12',
    help: 'Typical minutes until usual activity resumed; use the same approach each week.',
  },
  'adult-yelling': {
    kind: 'number',
    integer: true,
    min: 0,
    max: 999,
    step: 1,
    placeholder: 'e.g. 1',
    help: 'Count difficult moments that included adult yelling.',
  },
  'repair-quality': {
    kind: 'select',
    min: 1,
    max: 5,
    options: [
      [1, '1 — no repair yet'],
      [2, '2'],
      [3, '3 — partial repair'],
      [4, '4'],
      [5, '5 — accountable repair and restoration'],
    ],
    help: 'A personal 1–5 reflection, not a validated clinical score.',
  },
  'parent-stress': {
    kind: 'select',
    min: 1,
    max: 5,
    options: [
      [1, '1 — low'],
      [2, '2'],
      [3, '3 — moderate'],
      [4, '4'],
      [5, '5 — very high'],
    ],
    help: 'Your overall caregiving stress this week, using the same meaning each time.',
  },
};

const TRACKER_METRICS = METRICS.map((metric) => ({ ...metric, ...FIELD_CONFIG[metric.id] }));

function getBrowserStorage() {
  try {
    const storage = globalThis.localStorage;
    storage.getItem(STORAGE_KEY);
    return storage;
  } catch {
    return null;
  }
}

const browserStorage = getBrowserStorage();

const state = {
  scenarioId: SCENARIOS[0].id,
  ageId: AGE_BANDS.find((age) => age.id === 'school-age')?.id ?? AGE_BANDS[0].id,
  currentStep: 0,
  guideComplete: false,
  selectedWeek: 1,
  checkIns: loadCheckIns(browserStorage, TRACKER_METRICS),
  sessionOnlyWeeks: {},
};

const elements = {
  ageOptions: document.querySelector('#age-options'),
  checkInForm: document.querySelector('#check-in-form'),
  clearCheckIns: document.querySelector('#clear-check-ins'),
  comparisonBody: document.querySelector('#comparison-body'),
  comparisonHead: document.querySelector('#comparison-head'),
  comparisonSummary: document.querySelector('#comparison-summary'),
  evidenceList: document.querySelector('#evidence-list'),
  formWeekLabel: document.querySelector('#form-week-label'),
  laterPreview: document.querySelector('#later-preview'),
  metricFields: document.querySelector('#metric-fields'),
  printSummary: document.querySelector('#print-summary'),
  safetyDialog: document.querySelector('#safety-dialog'),
  safetyDialogContent: document.querySelector('#safety-dialog-content'),
  saveStatus: document.querySelector('#save-status'),
  scenarioSelect: document.querySelector('#scenario-select'),
  selectionSummary: document.querySelector('#selection-summary'),
  stepAside: document.querySelector('#step-aside'),
  stepContent: document.querySelector('#step-content'),
  stepper: document.querySelector('#stepper'),
  toast: document.querySelector('#toast'),
  weekFocus: document.querySelector('#week-focus'),
  weekTabs: document.querySelector('#week-tabs'),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function markStorageAsSessionOnly() {
  const privacyLabel = document.querySelector('.privacy-note span');
  const localLabel = document.querySelector('.local-label');
  if (privacyLabel) privacyLabel.textContent = 'This session only';
  if (localLabel) localLabel.textContent = 'Session only';
}

function getActiveAge() {
  return AGE_BANDS.find((age) => age.id === state.ageId) ?? AGE_BANDS[0];
}

function currentViewFromHash() {
  const requestedView = window.location.hash.replace(/^#/, '');
  return VALID_VIEWS.has(requestedView) ? requestedView : 'guide';
}

function renderView({ moveFocus = false } = {}) {
  const activeView = currentViewFromHash();

  document.querySelectorAll('[data-view]').forEach((view) => {
    const isActive = view.dataset.view === activeView;
    view.hidden = !isActive;
    view.classList.toggle('is-entering', isActive);
  });

  document.querySelectorAll('[data-view-target]').forEach((link) => {
    if (link.dataset.viewTarget === activeView) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });

  const viewTitles = {
    guide: 'Guide',
    'check-in': '4-week check-in',
    evidence: 'Evidence',
    about: 'About',
  };
  document.title = `${viewTitles[activeView]} — Steady Steps`;

  if (activeView === 'check-in') renderTracker();

  if (moveFocus) {
    const heading = document.querySelector(`[data-view="${activeView}"] h1`);
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
    document.querySelector('#main-content')?.scrollIntoView({ block: 'start' });
  }
}

function renderGuideControls() {
  elements.scenarioSelect.innerHTML = SCENARIOS.map(
    (scenario) =>
      `<option value="${escapeHtml(scenario.id)}">${escapeHtml(scenario.title)}</option>`,
  ).join('');
  elements.scenarioSelect.value = state.scenarioId;

  elements.ageOptions.innerHTML = AGE_BANDS.map(
    (age) => `
      <div class="segment-option">
        <input
          id="age-${escapeHtml(age.id)}"
          name="age-band"
          type="radio"
          value="${escapeHtml(age.id)}"
          ${age.id === state.ageId ? 'checked' : ''}
        />
        <label for="age-${escapeHtml(age.id)}">${escapeHtml(age.label)}</label>
      </div>
    `,
  ).join('');

  elements.scenarioSelect.addEventListener('change', (event) => {
    state.scenarioId = event.target.value;
    state.currentStep = 0;
    state.guideComplete = false;
    renderGuide();
    announce(`Loaded ${getScenario(state.scenarioId).title}.`);
  });

  elements.ageOptions.addEventListener('change', (event) => {
    if (event.target.name !== 'age-band') return;
    state.ageId = event.target.value;
    state.currentStep = 0;
    state.guideComplete = false;
    renderGuide();
    announce(`Language changed to ${getActiveAge().label}.`);
  });
}

function renderGuide({ focusHeading = false } = {}) {
  const scenario = getScenario(state.scenarioId);
  const age = getActiveAge();
  const ageContent = getScenarioAgeContent(state.scenarioId, state.ageId);
  const step = ageContent.steps[state.currentStep];
  const stepNumber = state.currentStep + 1;

  elements.selectionSummary.textContent = `${ageContent.intro} ${age.guidance}`;

  elements.stepper.innerHTML = STEP_DEFINITIONS.map((definition, index) => {
    const classNames = ['stepper-item'];
    if (index < state.currentStep) classNames.push('is-complete');
    if (index === state.currentStep) classNames.push('is-current');

    return `
      <li class="${classNames.join(' ')}">
        <button
          class="stepper-button"
          type="button"
          data-step-index="${index}"
          ${index === state.currentStep ? 'aria-current="step"' : ''}
          aria-label="Step ${index + 1}: ${escapeHtml(definition.title)}"
        >
          <span class="stepper-number">${index + 1}</span>
          <span class="stepper-label">${escapeHtml(STEP_SHORT_LABELS[index])}</span>
        </button>
      </li>
    `;
  }).join('');

  const caution = step.caution
    ? `<p class="step-caution"><strong>Keep in mind:</strong> ${escapeHtml(step.caution)}</p>`
    : '';
  const completion = state.guideComplete
    ? `
      <div class="completion-panel" role="status">
        <strong>You reached the later-learning step.</strong>
        <p>You do not need a perfect script. Keep the useful part, repair adult mistakes, and seek support when the pattern is severe or chronic.</p>
        <div class="completion-actions">
          <button class="primary-button print-summary-trigger" type="button" aria-describedby="print-summary-help">Print or save as PDF</button>
          <a class="secondary-button" href="#check-in">Open the 4-week check-in</a>
          <button class="secondary-button" id="restart-guide" type="button">Review from safety</button>
        </div>
        <p class="completion-helper" id="print-summary-help">Opens your browser’s print dialog. Only this situation and age are included; check-in data is not included.</p>
      </div>
    `
    : '';
  const stepNavigation = state.guideComplete
    ? ''
    : `
      <div class="step-navigation" aria-label="Guide step controls">
        <button class="secondary-button" id="previous-step" type="button" ${state.currentStep === 0 ? 'disabled' : ''}>
          <span class="button-arrow" aria-hidden="true">←</span>
          Back
        </button>
        <button class="primary-button" id="next-step" type="button">
          ${state.currentStep === STEP_DEFINITIONS.length - 1 ? 'Finish this guide' : `Next · ${escapeHtml(STEP_SHORT_LABELS[state.currentStep + 1])}`}
          <span class="button-arrow" aria-hidden="true">→</span>
        </button>
      </div>
    `;

  elements.stepContent.innerHTML = `
    <p class="step-kicker">Step ${stepNumber} of ${STEP_DEFINITIONS.length} · ${escapeHtml(age.label)}</p>
    <p class="step-index" aria-hidden="true">${String(stepNumber).padStart(2, '0')}</p>
    <h2 id="active-step-heading" tabindex="-1">${escapeHtml(step.guidance)}</h2>
    <p class="step-guidance">${escapeHtml(step.rationale)}</p>
    <blockquote class="suggested-phrase">${escapeHtml(step.phrase)}</blockquote>
    <ul class="step-actions" aria-label="Actions for this step">
      ${step.actions.map((action) => `<li>${escapeHtml(action)}</li>`).join('')}
    </ul>
    ${caution}
    ${completion}
    ${stepNavigation}
  `;

  const reminderItems = [
    {
      title: 'First move',
      copy: step.actions[0],
    },
    {
      title: 'Developmental fit',
      copy: age.guidance,
    },
    {
      title: state.currentStep === 6 ? 'Repair is accountability' : 'Keep it brief',
      copy:
        step.caution ||
        (state.currentStep === 6
          ? 'Repair your own errors without asking the child to comfort you.'
          : 'Say the useful part, then pause. Teaching can wait until calm.'),
    },
  ];

  elements.stepAside.innerHTML = `
    <div>
      <h2>Keep it workable</h2>
      <p>${escapeHtml(scenario.title)} · ${escapeHtml(age.label)}</p>
    </div>
    <ol class="aside-list">
      ${reminderItems
        .map(
          (item, index) => `
            <li>
              <span class="aside-number" aria-hidden="true">${index + 1}</span>
              <span>
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.copy)}</span>
              </span>
            </li>
          `,
        )
        .join('')}
    </ol>
    <button class="aside-safety safety-trigger" type="button">
      <span>If anyone is in immediate danger</span>
      <span aria-hidden="true">→</span>
    </button>
  `;

  elements.laterPreview.innerHTML = `
    <div>
      <h2>Later, when calm</h2>
      <p>${escapeHtml(ageContent.transitionTip)}</p>
    </div>
    <div class="later-prompt">
      <strong>Try this repair prompt</strong>
      <p>${escapeHtml(ageContent.repairPrompt)}</p>
    </div>
  `;

  renderPrintSummary();

  document.querySelector('#previous-step')?.addEventListener('click', () => moveToStep(state.currentStep - 1));
  document.querySelector('#next-step')?.addEventListener('click', () => {
    if (state.currentStep === STEP_DEFINITIONS.length - 1) {
      state.guideComplete = true;
      renderGuide({ focusHeading: true });
      document.querySelector('.completion-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    moveToStep(state.currentStep + 1);
  });
  document.querySelector('#restart-guide')?.addEventListener('click', () => {
    state.guideComplete = false;
    moveToStep(0);
  });

  if (focusHeading) document.querySelector('#active-step-heading')?.focus({ preventScroll: true });
}

function renderPrintSummary() {
  const summary = buildScenarioSummary(state.scenarioId, state.ageId);
  if (!summary) {
    elements.printSummary.replaceChildren();
    return;
  }

  elements.printSummary.innerHTML = `
    <header class="print-summary-header">
      <p class="print-brand">Steady Steps</p>
      <h1 id="print-summary-title">${escapeHtml(summary.scenario.title)}</h1>
      <p class="print-summary-context">${escapeHtml(summary.age.label)} · Selected scenario summary</p>
      <p class="print-summary-description">${escapeHtml(summary.scenario.description)}</p>
      <p>${escapeHtml(summary.intro)} ${escapeHtml(summary.age.guidance)}</p>
    </header>

    <aside class="print-safety" aria-labelledby="print-safety-title">
      <h2 id="print-safety-title">Safety comes first</h2>
      <p>${escapeHtml(summary.boundaries.immediateDanger)}</p>
    </aside>

    <ol class="print-steps" aria-label="Seven-step summary">
      ${summary.steps
        .map(
          (step) => `
            <li class="print-step">
              <div class="print-step-heading">
                <span aria-hidden="true">${String(step.order).padStart(2, '0')}</span>
                <h2>${escapeHtml(step.title)}</h2>
              </div>
              <p>${escapeHtml(step.guidance)}</p>
              <blockquote>
                <strong>Words you could try</strong>
                “${escapeHtml(step.phrase)}”
              </blockquote>
              <ul>
                ${step.actions.map((action) => `<li>${escapeHtml(action)}</li>`).join('')}
              </ul>
              ${step.caution ? `<p class="print-caution"><strong>Keep in mind:</strong> ${escapeHtml(step.caution)}</p>` : ''}
            </li>
          `,
        )
        .join('')}
    </ol>

    <section class="print-later" aria-labelledby="print-later-title">
      <h2 id="print-later-title">Later, when calm</h2>
      <p>${escapeHtml(summary.transitionTip)}</p>
      <p><strong>Repair prompt:</strong> ${escapeHtml(summary.repairPrompt)}</p>
    </section>

    <footer class="print-boundaries">
      <h2>Keep the limits of this summary clear</h2>
      <p>${escapeHtml(summary.boundaries.assessment)}</p>
      <p>${escapeHtml(summary.boundaries.disclaimer)}</p>
      <p>${escapeHtml(summary.boundaries.protocolStatus)}</p>
      <p>${escapeHtml(summary.boundaries.privacy)}</p>
    </footer>
  `;
}

function moveToStep(nextIndex) {
  state.currentStep = Math.max(0, Math.min(STEP_DEFINITIONS.length - 1, nextIndex));
  state.guideComplete = false;
  renderGuide({ focusHeading: true });
  document.querySelector('#stepper')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderEvidence() {
  elements.evidenceList.innerHTML = EVIDENCE_ENTRIES.map(
    (entry) => `
      <article class="evidence-entry">
        <div>
          <p class="section-label">Intervention</p>
          <h2>${escapeHtml(entry.intervention)}</h2>
          <p class="evidence-tier"><span>Evidence tier</span>${escapeHtml(entry.evidenceTier)}</p>
        </div>
        <dl class="evidence-fields">
          <div>
            <dt>Population</dt>
            <dd>${escapeHtml(entry.population)}</dd>
          </div>
          <div>
            <dt>Outcome</dt>
            <dd>${escapeHtml(entry.outcome)}</dd>
          </div>
          <div class="limitation">
            <dt>Limitation</dt>
            <dd>${escapeHtml(entry.limitation)}</dd>
          </div>
        </dl>
      </article>
    `,
  ).join('');
}

function renderSafetyDialog() {
  elements.safetyDialogContent.innerHTML = `
    <div class="danger-first">
      <strong>Immediate or significant danger</strong>
      <p>${escapeHtml(SAFEGUARDING.immediateDanger)}</p>
    </div>
    <h3>Self-help is not enough when there is:</h3>
    <ul>
      ${SAFEGUARDING.flags
        .map((flag) => `<li><strong>${escapeHtml(flag.label)}:</strong> ${escapeHtml(flag.copy)}</li>`)
        .join('')}
    </ul>
    <h3>During immediate physical risk</h3>
    <p class="safety-dialog-content-note">
      Separate people, remove dangerous objects, or move to safety. Do not prioritize dialogue while someone is being
      harmed. ${escapeHtml(PRODUCT_GUARDRAILS.nonviolence)}
    </p>
    <h3>Next step</h3>
    <p class="safety-dialog-content-note">${escapeHtml(SAFEGUARDING.assessment)}</p>
  `;
}

function openSafetyDialog() {
  if (typeof elements.safetyDialog.showModal === 'function') {
    if (!elements.safetyDialog.open) elements.safetyDialog.showModal();
  } else {
    elements.safetyDialog.setAttribute('open', '');
  }
}

function renderWeekTabs() {
  elements.weekTabs.innerHTML = PRACTICE_WEEKS.map((week) => {
    const isSelected = week.week === state.selectedWeek;
    const hasEntry = Boolean(state.checkIns[week.week]);
    const isSessionOnly = Boolean(state.sessionOnlyWeeks[week.week]);
    return `
      <button
        class="week-tab ${hasEntry ? 'has-entry' : ''}"
        id="week-tab-${week.week}"
        type="button"
        role="tab"
        aria-selected="${isSelected}"
        aria-controls="check-in-form"
        tabindex="${isSelected ? '0' : '-1'}"
        data-week="${week.week}"
      >
        Week ${week.week}
        <span>${isSessionOnly ? 'Session only' : hasEntry ? week.theme : 'Not recorded'}</span>
      </button>
    `;
  }).join('');
}

function renderWeekFocus() {
  const week = PRACTICE_WEEKS.find((item) => item.week === state.selectedWeek);
  elements.weekFocus.innerHTML = `
    <p class="week-number" aria-hidden="true">0${week.week}</p>
    <p class="section-label">This week’s focus</p>
    <h2>${escapeHtml(week.theme)}</h2>
    <p>${escapeHtml(week.measurementAction)}</p>
    <ul>${week.actions.map((action) => `<li>${escapeHtml(action)}</li>`).join('')}</ul>
  `;
}

function renderMetricFields() {
  const savedValues = state.checkIns[state.selectedWeek]?.values ?? state.checkIns[state.selectedWeek] ?? {};
  const currentValues = savedValues;
  elements.formWeekLabel.textContent = `Week ${state.selectedWeek} check-in`;

  elements.metricFields.innerHTML = TRACKER_METRICS.map((metric) => {
    const savedValue = currentValues[metric.id] ?? '';
    const control =
      metric.kind === 'select'
        ? `
          <select id="metric-${escapeHtml(metric.id)}" name="${escapeHtml(metric.id)}" aria-describedby="help-${escapeHtml(metric.id)} error-${escapeHtml(metric.id)}">
            <option value="">Choose a rating</option>
            ${metric.options
              .map(
                ([value, label]) =>
                  `<option value="${value}" ${Number(savedValue) === value ? 'selected' : ''}>${escapeHtml(label)}</option>`,
              )
              .join('')}
          </select>
        `
        : `
          <input
            id="metric-${escapeHtml(metric.id)}"
            name="${escapeHtml(metric.id)}"
            type="number"
            min="${metric.min}"
            max="${metric.max}"
            step="${metric.step}"
            inputmode="numeric"
            placeholder="${escapeHtml(metric.placeholder)}"
            value="${escapeHtml(savedValue)}"
            aria-describedby="help-${escapeHtml(metric.id)} error-${escapeHtml(metric.id)}"
          />
        `;

    return `
      <div class="metric-field" data-metric-field="${escapeHtml(metric.id)}">
        <label for="metric-${escapeHtml(metric.id)}">${escapeHtml(metric.label)}</label>
        ${control}
        <span class="metric-help" id="help-${escapeHtml(metric.id)}">${escapeHtml(metric.help)}</span>
        <span class="field-error" id="error-${escapeHtml(metric.id)}" aria-live="polite"></span>
      </div>
    `;
  }).join('');

  const hasEntry = Boolean(state.checkIns[state.selectedWeek]);
  elements.saveStatus.textContent = hasEntry
    ? state.sessionOnlyWeeks[state.selectedWeek]
      ? `Week ${state.selectedWeek} is available for this session only.`
      : `Week ${state.selectedWeek} is saved. Saving again will update it.`
    : '';
}

function formatMetricValue(metric, value) {
  if (value === undefined || value === null) return '<span class="not-recorded">Not recorded</span>';
  if (metric.id === 'frequency' || metric.id === 'adult-yelling') return `${escapeHtml(value)} events`;
  if (metric.id === 'recovery-time') return `${escapeHtml(value)} min`;
  return `${escapeHtml(value)} / 5`;
}

function renderComparison() {
  elements.comparisonSummary.textContent = describeCheckIns(state.checkIns);
  elements.comparisonHead.innerHTML = `
    <tr>
      <th scope="col">Week</th>
      ${TRACKER_METRICS.map((metric) => `<th scope="col">${escapeHtml(metric.label)}</th>`).join('')}
    </tr>
  `;
  elements.comparisonBody.innerHTML = PRACTICE_WEEKS.map((week) => {
    const entry = state.checkIns[week.week];
    const values = entry?.values ?? entry;
    return `
      <tr>
        <th scope="row">Week ${week.week}</th>
        ${TRACKER_METRICS.map((metric) => `<td>${formatMetricValue(metric, values?.[metric.id])}</td>`).join('')}
      </tr>
    `;
  }).join('');
}

function renderTracker() {
  renderWeekTabs();
  renderWeekFocus();
  renderMetricFields();
  renderComparison();
}

function selectWeek(weekNumber, { focusTab = false } = {}) {
  state.selectedWeek = Math.max(1, Math.min(4, weekNumber));
  renderTracker();
  if (focusTab) document.querySelector(`#week-tab-${state.selectedWeek}`)?.focus();
}

function clearFieldErrors() {
  document.querySelectorAll('[data-metric-field]').forEach((field) => {
    field.classList.remove('is-invalid');
    field.querySelector('.field-error').textContent = '';
    field.querySelector('input, select')?.removeAttribute('aria-invalid');
  });
}

function showFieldErrors(errors) {
  clearFieldErrors();
  for (const [metricId, message] of Object.entries(errors)) {
    const wrapper = document.querySelector(`[data-metric-field="${metricId}"]`);
    wrapper?.classList.add('is-invalid');
    const control = wrapper?.querySelector('input, select');
    control?.setAttribute('aria-invalid', 'true');
    const error = wrapper?.querySelector('.field-error');
    if (error) error.textContent = message;
  }
  const firstInvalid = document.querySelector('[aria-invalid="true"]');
  firstInvalid?.focus();
}

function saveSelectedWeek(event) {
  event.preventDefault();
  const formData = new FormData(elements.checkInForm);
  const inputValues = Object.fromEntries(TRACKER_METRICS.map((metric) => [metric.id, formData.get(metric.id)]));
  const result = validateCheckIn(inputValues, TRACKER_METRICS);

  if (!result.isValid) {
    showFieldErrors(result.errors);
    elements.saveStatus.textContent = 'Complete all six observations before saving.';
    return;
  }

  clearFieldErrors();

  const updatedCheckIns = {
    ...state.checkIns,
    [state.selectedWeek]: { values: result.values },
  };

  const persisted = storeCheckIns(browserStorage, updatedCheckIns);
  state.checkIns = updatedCheckIns;
  if (persisted) delete state.sessionOnlyWeeks[state.selectedWeek];
  else state.sessionOnlyWeeks[state.selectedWeek] = true;

  renderTracker();
  elements.saveStatus.textContent = persisted
    ? `Week ${state.selectedWeek} saved on this device.`
    : `Week ${state.selectedWeek} is available for this session, but this browser blocked local saving.`;
  if (!persisted) {
    markStorageAsSessionOnly();
  }
  announce(persisted ? `Week ${state.selectedWeek} saved.` : 'Browser storage is unavailable.');
}

function clearAllCheckIns() {
  const confirmed = window.confirm(
    'Clear all four local check-ins? This version has no account, sync, or backup, so the data cannot be recovered.',
  );
  if (!confirmed) return;

  const clearedFromStorage = clearStoredCheckIns(browserStorage);
  if (browserStorage && !clearedFromStorage) {
    announce('This browser could not clear the saved check-ins. Use its site-data controls instead.');
    return;
  }
  state.checkIns = {};
  state.sessionOnlyWeeks = {};
  renderTracker();
  announce('All check-ins were cleared from this browser.');
}

let toastTimer;
function announce(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => elements.toast.classList.remove('is-visible'), 2600);
}

function bindEvents() {
  window.addEventListener('hashchange', () => renderView({ moveFocus: true }));

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      state.checkIns = loadCheckIns(browserStorage, TRACKER_METRICS);
      state.sessionOnlyWeeks = {};
      renderTracker();
    }
  });

  document.addEventListener('click', (event) => {
    const stepButton = event.target.closest('[data-step-index]');
    if (stepButton) moveToStep(Number(stepButton.dataset.stepIndex));

    if (event.target.closest('.safety-trigger')) openSafetyDialog();

    const printTrigger = event.target.closest('.print-summary-trigger');
    if (printTrigger) {
      renderPrintSummary();
      const opened =
        typeof window.print === 'function'
          ? requestScenarioPrint(window.print.bind(window))
          : false;
      if (!opened) announce('Printing is unavailable in this browser.');
    }
  });

  elements.weekTabs.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-week]');
    if (tab) selectWeek(Number(tab.dataset.week), { focusTab: true });
  });

  elements.weekTabs.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextWeek = state.selectedWeek;
    if (event.key === 'ArrowLeft') nextWeek -= 1;
    if (event.key === 'ArrowRight') nextWeek += 1;
    if (event.key === 'Home') nextWeek = 1;
    if (event.key === 'End') nextWeek = 4;
    if (nextWeek < 1) nextWeek = 4;
    if (nextWeek > 4) nextWeek = 1;
    selectWeek(nextWeek, { focusTab: true });
  });

  elements.checkInForm.addEventListener('submit', saveSelectedWeek);
  elements.clearCheckIns.addEventListener('click', clearAllCheckIns);
  document.querySelector('.skip-link')?.addEventListener('click', (event) => {
    event.preventDefault();
    const main = document.querySelector('#main-content');
    main?.focus({ preventScroll: true });
    main?.scrollIntoView({ block: 'start' });
  });

  elements.safetyDialog.addEventListener('click', (event) => {
    if (event.target === elements.safetyDialog) elements.safetyDialog.close();
  });
}

function initialize() {
  renderGuideControls();
  renderGuide();
  renderEvidence();
  renderSafetyDialog();
  renderTracker();
  bindEvents();
  renderView();

  if (!browserStorage) {
    markStorageAsSessionOnly();
  }

  if (!window.location.hash || !VALID_VIEWS.has(window.location.hash.slice(1))) {
    window.history.replaceState(null, '', '#guide');
  }
}

initialize();
