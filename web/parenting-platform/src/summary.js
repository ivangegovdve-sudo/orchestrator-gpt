import {
  AGE_BANDS,
  PRODUCT_GUARDRAILS,
  SAFEGUARDING,
  getScenario,
  getScenarioAgeContent,
} from './content.js';

export const SUMMARY_PRIVACY_NOTICE =
  'Creating this summary needs no account. Steady Steps does not upload or record the summary and does not retain a copy; printing or saving a PDF is handled by your browser or operating system.';

export function buildScenarioSummary(scenarioId, ageId) {
  const scenario = getScenario(scenarioId);
  const age = AGE_BANDS.find((item) => item.id === ageId);
  const ageContent = getScenarioAgeContent(scenarioId, ageId);

  if (!scenario || !age || !ageContent) return null;

  return {
    scenario: {
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
    },
    age: {
      id: age.id,
      label: age.label,
      guidance: age.guidance,
    },
    intro: ageContent.intro,
    steps: ageContent.steps.map(({ id, order, title, guidance, phrase, actions, caution }) => ({
      id,
      order,
      title,
      guidance,
      phrase,
      actions: [...actions],
      ...(caution ? { caution } : {}),
    })),
    transitionTip: ageContent.transitionTip,
    repairPrompt: ageContent.repairPrompt,
    boundaries: {
      disclaimer: PRODUCT_GUARDRAILS.disclaimer,
      protocolStatus: PRODUCT_GUARDRAILS.protocolStatus,
      immediateDanger: SAFEGUARDING.immediateDanger,
      assessment: SAFEGUARDING.assessment,
      privacy: SUMMARY_PRIVACY_NOTICE,
    },
  };
}

export function requestScenarioPrint(printCallback) {
  if (typeof printCallback !== 'function') return false;
  printCallback();
  return true;
}
