const deepFreeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }

  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

export const AGE_BANDS = deepFreeze([
  {
    id: "toddler",
    label: "Toddler",
    guidance:
      "Use very short language, immediate safety, simple choices, repetition, modeling, and co-regulation.",
  },
  {
    id: "school-age",
    label: "School-age",
    guidance:
      "Add calm problem-solving, routines, realistic responsibilities, and practice of replacement skills.",
  },
  {
    id: "adolescent",
    label: "Adolescent",
    guidance:
      "Take their reasoning seriously, preserve privacy, negotiate genuine independence, and tie firm limits to safety.",
  },
]);

export const STEP_DEFINITIONS = deepFreeze([
  {
    id: "safety",
    order: 1,
    title: "Safety first",
    summary: "Stop immediate harm before trying to teach or reason.",
  },
  {
    id: "parent-regulation",
    order: 2,
    title: "Regulate yourself",
    summary: "Notice your stress response and choose the shortest useful response.",
  },
  {
    id: "connection",
    order: 3,
    title: "Connect",
    summary: "Name a possible perspective without insisting that you know their mind.",
  },
  {
    id: "clear-nonviolent-limit",
    order: 4,
    title: "State a clear, nonviolent limit",
    summary: "Say the boundary briefly, without shame, fear, or repeated argument.",
  },
  {
    id: "workable-alternative",
    order: 5,
    title: "Offer a workable alternative",
    summary: "Give a real choice or a safe replacement behavior the child can actually use.",
  },
  {
    id: "co-regulation",
    order: 6,
    title: "Co-regulate",
    summary: "Reduce demands and stimulation while the child recovers.",
  },
  {
    id: "later-learning-repair",
    order: 7,
    title: "Learn and repair later",
    summary: "When everyone is calm, practice the next-time skill and restore what was harmed.",
  },
]);

const STEP_BY_ID = new Map(STEP_DEFINITIONS.map((step) => [step.id, step]));

const createStep = (id, content) => {
  const definition = STEP_BY_ID.get(id);

  if (!definition) {
    throw new Error(`Unknown difficult-moment step: ${id}`);
  }

  return {
    id,
    order: definition.order,
    title: definition.title,
    guidance: content.guidance,
    rationale: content.rationale,
    phrase: content.phrase,
    actions: content.actions,
    ...(content.caution ? { caution: content.caution } : {}),
  };
};

const createAgeContent = ({ intro, transitionTip, repairPrompt, steps }) => {
  const expectedIds = STEP_DEFINITIONS.map((step) => step.id);
  const actualIds = steps.map((step) => step.id);

  if (
    actualIds.length !== expectedIds.length ||
    actualIds.some((id, index) => id !== expectedIds[index])
  ) {
    throw new Error(
      `Scenario steps must follow this order: ${expectedIds.join(", ")}`,
    );
  }

  return { intro, transitionTip, repairPrompt, steps };
};

const createScenario = (scenario) => {
  const expectedAgeIds = AGE_BANDS.map((age) => age.id);
  const actualAgeIds = Object.keys(scenario.ageContent);

  if (
    actualAgeIds.length !== expectedAgeIds.length ||
    expectedAgeIds.some((ageId) => !scenario.ageContent[ageId])
  ) {
    throw new Error(
      `Scenario ${scenario.id} must include: ${expectedAgeIds.join(", ")}`,
    );
  }

  return scenario;
};

export const SCENARIOS = deepFreeze([
  createScenario({
    id: "screen-time",
    title: "Screen-time transition",
    shortTitle: "Screen time",
    description:
      "Help a child stop a device activity without debating fairness while they are overwhelmed.",
    ageContent: {
      toddler: createAgeContent({
        intro:
          "Keep words concrete and expect to help with the transition; a toddler may not yet stop smoothly on a verbal cue alone.",
        transitionTip:
          "Before the next session, use the same short warning and a predictable next activity.",
        repairPrompt:
          "When calm, practice handing over the device and moving together to the next activity.",
        steps: [
          createStep("safety", {
            guidance: "Protect people and the device before continuing the transition.",
            rationale:
              "Immediate safety takes priority over a polished explanation when a device is being thrown or bodies are at risk.",
            phrase: "I will keep you and the tablet safe.",
            actions: [
              "Move breakable or dangerous objects out of reach.",
              "If the device is being thrown, calmly secure it and create space using the least physical intervention needed for safety.",
            ],
          }),
          createStep("parent-regulation", {
            guidance: "Pause before repeating the demand more loudly.",
            rationale:
              "Use one slower exhale and fewer words before responding; avoid a threat or lecture.",
            phrase: "One slow breath. Quiet voice. Few words.",
            actions: [
              "Notice your jaw, shoulders, and urge to grab or threaten.",
              "Take one slower exhale and lower your volume.",
            ],
          }),
          createStep("connection", {
            guidance: "Name the disappointment without requiring agreement.",
            rationale: "Validation accepts the feeling, not a demand for more screen time.",
            phrase: "You wanted more. Stopping is hard.",
            actions: ["Pause long enough for the words to land; do not quiz the child about the feeling."],
          }),
          createStep("clear-nonviolent-limit", {
            guidance: "State the finished-for-now boundary once or twice.",
            rationale: "A brief, predictable limit is easier to process than repeated negotiation.",
            phrase: "The tablet is finished for now.",
            actions: ["Put the device in its usual out-of-reach place without shaming or threatening."],
          }),
          createStep("workable-alternative", {
            guidance: "Offer two real, immediate next steps.",
            rationale: "Simple genuine choices support autonomy without reopening the limit.",
            phrase: "You can sit with me or carry your cup to the table.",
            actions: ["Show the two options; if choosing is too hard, calmly begin the familiar next routine."],
          }),
          createStep("co-regulation", {
            guidance: "Stay available with low stimulation while the wave passes.",
            rationale: "A flooded toddler needs help recovering before teaching can work.",
            phrase: "I’m nearby. You can have space or come close.",
            actions: [
              "Dim or quiet the environment where possible.",
              "Do not force eye contact, touch, deep breaths, or an apology.",
            ],
          }),
          createStep("later-learning-repair", {
            guidance: "Practice the transition briefly when calm.",
            rationale: "Model and repeat the replacement skill while calm; skip the delayed lecture.",
            phrase: "Next time, we’ll hear the warning, press stop, and choose what comes next.",
            actions: [
              "Rehearse pressing stop and handing over the device once.",
              "Notice the next concrete attempt: “You stopped when the timer rang.”",
            ],
          }),
        ],
      }),
      "school-age": createAgeContent({
        intro:
          "Keep the end point predictable, acknowledge that leaving a game can be difficult, and save planning for calm.",
        transitionTip:
          "Agree in advance on warnings, where play can be paused, and what must happen next.",
        repairPrompt:
          "Review what made stopping hard and choose one realistic change for the next session.",
        steps: [
          createStep("safety", {
            guidance: "First stop throwing, hitting, unsafe movement, or damage.",
            rationale: "Safety comes before discussing whether the screen rule is fair.",
            phrase: "I’m moving the device while we keep bodies and things safe.",
            actions: [
              "Increase distance between people if needed.",
              "Remove the device or other objects only as needed to prevent immediate harm.",
            ],
          }),
          createStep("parent-regulation", {
            guidance: "Notice the urge to argue point by point.",
            rationale: "Short, low-volume responses avoid turning the limit into a power struggle.",
            phrase: "I can listen later; right now I need to be brief.",
            actions: ["Exhale slowly, unclench your hands, and choose one sentence to repeat if needed."],
          }),
          createStep("connection", {
            guidance: "Reflect the likely loss without claiming certainty.",
            rationale: "The child can feel understood without the time limit changing.",
            phrase: "It looks like stopping in the middle felt really frustrating.",
            actions: ["Allow disagreement with your interpretation instead of defending it."],
          }),
          createStep("clear-nonviolent-limit", {
            guidance: "Make tonight’s boundary plain.",
            rationale: "Clear instructions and transparent follow-through are supported behavioral practices.",
            phrase: "Screen time is finished tonight. I won’t argue about it while we’re upset.",
            actions: ["Follow the previously explained device routine without insults, guilt, or invented threats."],
          }),
          createStep("workable-alternative", {
            guidance: "Offer a way to recover and a time for future problem-solving.",
            rationale: "A workable option is concrete and does not pretend the limit is optional.",
            phrase: "You can take space or sit near me. We can plan tomorrow’s stopping point after dinner.",
            actions: ["Let the child choose space or proximity; defer schedule changes until calm."],
          }),
          createStep("co-regulation", {
            guidance: "Reduce language and remain calmly available.",
            rationale: "Reasoning is less useful while arousal is high.",
            phrase: "We don’t have to solve this yet. I’m here when you’re ready.",
            actions: ["Pause questions, lectures, and demands for an immediate apology."],
          }),
          createStep("later-learning-repair", {
            guidance: "Review the trigger and rehearse a realistic stopping plan.",
            rationale: "Planning, routines, and practice help make the next transition more achievable.",
            phrase: "What would help you reach a save point and still finish at the agreed time?",
            actions: [
              "Choose an advance warning and a clear stop time together.",
              "Repair any damage or hurtful words without forcing an emotion performance.",
            ],
          }),
        ],
      }),
      adolescent: createAgeContent({
        intro:
          "Treat the adolescent’s priorities and arguments seriously while keeping transparent household or safety boundaries.",
        transitionTip:
          "Set device expectations collaboratively in advance, including genuine zones of privacy and independence.",
        repairPrompt:
          "Revisit the rule at an agreed time and explain the reason; change it if their proposal is workable.",
        steps: [
          createStep("safety", {
            guidance: "Respond first only to immediate danger or serious property risk.",
            rationale: "Safety limits can be non-negotiable, but physical intervention should be the least needed for immediate safety.",
            phrase: "I’m stepping back so everyone stays safe. We can talk when there are no threats or damage.",
            actions: [
              "Create distance and move other people from danger.",
              "Do not wrestle over a device unless immediate safety truly requires intervention.",
            ],
          }),
          createStep("parent-regulation", {
            guidance: "Check whether anger or parental pride is driving the response.",
            rationale: "Adolescents need boundaries tied to a stated reason, not psychological control.",
            phrase: "I want to win this argument. I’m going to lower my voice and stick to the actual issue.",
            actions: ["Take one slower exhale and postpone any non-urgent consequence decision."],
          }),
          createStep("connection", {
            guidance: "Acknowledge the activity and the adolescent’s view.",
            rationale: "Taking an argument seriously does not require agreeing with it.",
            phrase: "I hear that logging off now feels unfair and that this matters to you.",
            actions: ["Listen for the specific concern without interrupting to rebut it."],
          }),
          createStep("clear-nonviolent-limit", {
            guidance: "State tonight’s limit and its reason without trying to control feelings.",
            rationale: "A legitimate rule can stand even when the adolescent remains angry or disagrees.",
            phrase: "You don’t have to agree. Tonight’s device cutoff still stands because of our sleep agreement.",
            actions: ["Use only follow-through that was transparent and proportionate; avoid shame or affection withdrawal."],
          }),
          createStep("workable-alternative", {
            guidance: "Offer genuine autonomy over how to end and when to revisit the rule.",
            rationale: "Use genuine decision ownership with adolescents rather than toddler-style choices.",
            phrase: "You can finish the message now or save your work first. We can review the cutoff tomorrow at seven.",
            actions: ["Allow a brief, real stopping choice if it is safe and consistent with the stated limit."],
          }),
          createStep("co-regulation", {
            guidance: "Respect a request for space while remaining available.",
            rationale: "Preserve privacy, lower stimulation, and avoid forced closeness while arousal falls.",
            phrase: "Take the space you need. I’ll be available, and we can return to this tomorrow.",
            actions: ["Stop pursuing the conversation unless a safety concern requires contact."],
          }),
          createStep("later-learning-repair", {
            guidance: "Hold the promised review and make room for a reasoned proposal.",
            rationale: "Keep genuine independence and safety boundaries in the same conversation.",
            phrase: "Tell me what rule you think would work and how it would protect sleep and responsibilities.",
            actions: [
              "Explain your concern and listen to the counterproposal.",
              "Own any yelling or disrespect without making the adolescent comfort you.",
            ],
          }),
        ],
      }),
    },
  }),
  createScenario({
    id: "hitting-biting",
    title: "Hitting or biting",
    shortTitle: "Hitting or biting",
    description:
      "Stop physical harm immediately, then teach a safe way to communicate the need once calm returns.",
    ageContent: {
      toddler: createAgeContent({
        intro:
          "Use immediate blocking or distance, very few words, and a simple replacement such as “stop,” “move,” or stomping.",
        transitionTip:
          "Notice common triggers such as crowding, waiting for a turn, hunger, fatigue, or sensory overload.",
        repairPrompt:
          "Model one safe signal and help restore the other person or damaged item without forcing affection.",
        steps: [
          createStep("safety", {
            guidance: "Block the hit or bite and separate bodies right away.",
            rationale: "Preventing immediate harm comes before explanation.",
            phrase: "I won’t let you hit or bite.",
            actions: [
              "Move the other child to safety or increase distance.",
              "Use only the least physical blocking needed to stop immediate harm.",
            ],
          }),
          createStep("parent-regulation", {
            guidance: "Settle your body enough to be firm without frightening the child.",
            rationale: "A concise response is more useful than a threat or lecture during high arousal.",
            phrase: "Slow breath. Firm hands, quiet voice.",
            actions: ["Notice your impulse to shame, shout, or demand an apology; lower your volume."],
          }),
          createStep("connection", {
            guidance: "Offer one tentative emotion or need label.",
            rationale: "Naming the likely experience supports emotion learning while keeping the behavior limit.",
            phrase: "You were angry. You wanted space.",
            actions: ["Keep the statement brief and accept that your guess may be wrong."],
          }),
          createStep("clear-nonviolent-limit", {
            guidance: "Repeat the physical-safety boundary, not a character judgment.",
            rationale: "Validation of anger never requires permitting harm.",
            phrase: "Angry is okay. Hitting and biting are not safe.",
            actions: ["Maintain enough distance to make the limit real."],
          }),
          createStep("workable-alternative", {
            guidance: "Give two or three actions a toddler can perform now.",
            rationale: "A concrete replacement is more developmentally useful than “be nice.”",
            phrase: "You can stomp, say “stop,” or come to me.",
            actions: ["Model the word or gesture once; do not require a perfect performance during distress."],
          }),
          createStep("co-regulation", {
            guidance: "Lower stimulation and stay nearby where safe.",
            rationale: "The child may need adult support before they can regain control.",
            phrase: "I’m here. I’ll keep everyone safe while your body calms.",
            actions: ["Avoid forced eye contact, touch, or an immediate apology."],
          }),
          createStep("later-learning-repair", {
            guidance: "Practice asking for space or a turn, then support concrete repair.",
            rationale: "Repair is restoring harm and learning a skill, not performing remorse on command.",
            phrase: "Let’s practice: “Move, please.” Then we can help check on them.",
            actions: [
              "Role-play the replacement once when both children are calm.",
              "Offer ways to help the hurt person without making affection conditional on an apology.",
            ],
          }),
        ],
      }),
      "school-age": createAgeContent({
        intro:
          "Separate first, then help the child identify a safe signal, exit, or request that can replace aggression.",
        transitionTip:
          "Plan for repeating antecedents and rehearse the exit or help-seeking step outside conflict.",
        repairPrompt:
          "Ask what happened before the hit, practice the replacement, and restore harm or damage.",
        steps: [
          createStep("safety", {
            guidance: "Separate people and remove dangerous objects before asking for an account.",
            rationale: "No one should have to stay within reach of further harm while adults investigate.",
            phrase: "I won’t let anyone be hit. Move with me so everyone is safe.",
            actions: [
              "Create distance between children.",
              "Use the least intervention needed for immediate safety and check for injury.",
            ],
          }),
          createStep("parent-regulation", {
            guidance: "Pause the urge to assign blame immediately.",
            rationale: "A regulated adult can protect safety without shaming or making assumptions on incomplete evidence.",
            phrase: "Safety first. I can hear what happened after I lower my voice.",
            actions: ["Take one slower exhale and keep the first response short."],
          }),
          createStep("connection", {
            guidance: "Reflect the likely intensity without excusing the hit.",
            rationale: "Feelings and actions can be addressed separately.",
            phrase: "Something felt very unfair, and you got really angry.",
            actions: ["Use tentative language and let the child correct your understanding later."],
          }),
          createStep("clear-nonviolent-limit", {
            guidance: "State the shared rule in behavioral terms.",
            rationale: "A clear safety rule is different from guilt, humiliation, or rejection.",
            phrase: "You may be angry. You may not hit, bite, or hurt someone’s body.",
            actions: ["Keep separation in place until the risk of another hit has passed."],
          }),
          createStep("workable-alternative", {
            guidance: "Offer a safe exit and a direct communication option.",
            rationale: "Replacement skills need to be specific enough to use in the next conflict.",
            phrase: "You can say “stop,” step away, or call me for help.",
            actions: ["Choose one option the child is willing to rehearse later."],
          }),
          createStep("co-regulation", {
            guidance: "Let the body settle before investigating or solving.",
            rationale: "Immediate reasoning and forced apologies can add demand while the child is flooded.",
            phrase: "We’ll talk after your body has recovered. You can be quiet here or take space nearby.",
            actions: ["Reduce questions and keep the children apart for now."],
          }),
          createStep("later-learning-repair", {
            guidance: "Hear accounts separately, identify the trigger, and practice the next move.",
            rationale: "Learning and restoration work better once everyone can think and listen.",
            phrase: "What came just before the hit, and which safe action will you try next time?",
            actions: [
              "Rehearse the chosen words, exit, or help signal.",
              "Support a concrete repair for injury or damage without forcing forgiveness.",
            ],
          }),
        ],
      }),
      adolescent: createAgeContent({
        intro:
          "Treat physical aggression or threats as a serious safety issue while preserving dignity and hearing the adolescent later.",
        transitionTip:
          "Make a specific safety plan for triggers, exits, trusted adults, and when outside support is needed.",
        repairPrompt:
          "Review the antecedent and impact, agree on a nonviolent next-time plan, and seek appropriate help if aggression is severe or persistent.",
        steps: [
          createStep("safety", {
            guidance: "Create distance and get others out of danger; escalate when risk is significant.",
            rationale: "Serious aggression and significant danger require safeguarding, not a longer script.",
            phrase: "I won’t stay in reach of hitting or threats. We are separating now.",
            actions: [
              "Move other people to safety and remove dangerous objects only if it is safe to do so.",
              "If danger is immediate or aggression is severe, stop the guide and contact appropriate emergency, clinical, or safeguarding support.",
            ],
          }),
          createStep("parent-regulation", {
            guidance: "Control the impulse to threaten back or win the confrontation.",
            rationale: "Lowering your own arousal supports clearer safety decisions.",
            phrase: "I’m stepping back and speaking briefly so this does not escalate.",
            actions: ["Take one slower exhale; ask another safe adult to take over if available."],
          }),
          createStep("connection", {
            guidance: "Acknowledge intensity without interpreting intent or minimizing harm.",
            rationale: "Understanding context is compatible with an unequivocal violence limit.",
            phrase: "I can see this became overwhelming. I’ll listen to what led up to it when we’re safe.",
            actions: ["Do not demand agreement, disclosure, or an explanation in the unsafe moment."],
          }),
          createStep("clear-nonviolent-limit", {
            guidance: "State the non-negotiable safety boundary plainly.",
            rationale: "Adolescents can disagree or feel angry; violence and threats still require a limit.",
            phrase: "Anger and disagreement are allowed. Hitting, biting, and threats are not.",
            actions: ["End the interaction for now if the boundary cannot be maintained safely."],
          }),
          createStep("workable-alternative", {
            guidance: "Offer adult-like options for exit and later communication.",
            rationale: "Genuine autonomy includes choosing a safe way to disengage.",
            phrase: "You can leave the room, text that you need space, or ask a trusted adult to join us.",
            actions: ["Let the adolescent choose a safe exit; agree on when and how to check in."],
          }),
          createStep("co-regulation", {
            guidance: "Respect space and do not pursue an argument.",
            rationale: "Reducing stimulation is more useful than forcing immediate resolution.",
            phrase: "We won’t solve this now. I’ll give you space and check in at the agreed time.",
            actions: ["Maintain necessary safety monitoring without using closeness as control."],
          }),
          createStep("later-learning-repair", {
            guidance: "Build a concrete prevention and repair plan; bring in help when self-help is insufficient.",
            rationale: "Severe or chronic aggression needs appropriate assessment rather than relying on generic guidance.",
            phrase: "What was the first warning sign, how will you exit next time, and what needs repair now?",
            actions: [
              "Agree on a signal, exit, and support person.",
              "Arrange appropriate clinical or safeguarding support for severe, repeated, or dangerous aggression.",
            ],
          }),
        ],
      }),
    },
  }),
  createScenario({
    id: "dressing-refusal",
    title: "Dressing refusal",
    shortTitle: "Getting dressed",
    description:
      "Check what makes dressing hard, state the real requirement, and offer genuine choices or support.",
    ageContent: {
      toddler: createAgeContent({
        intro:
          "Check hunger, sleep, sensory discomfort, fear, overload, and time pressure before treating refusal as defiance.",
        transitionTip:
          "Lay out two comfortable options and use the same short visual or verbal morning sequence.",
        repairPrompt:
          "Later, notice which fabric, timing, or step caused difficulty and adjust the routine.",
        steps: [
          createStep("safety", {
            guidance: "Check for immediate hazards and physical discomfort.",
            rationale: "The first task is safety, not compliance, especially if clothing hurts or the child is near a hazard.",
            phrase: "First I’m checking that your body is safe and nothing hurts.",
            actions: [
              "Move away from stairs, traffic, or other hazards if the struggle is happening nearby.",
              "Check quickly for pinching, temperature, or obvious sensory discomfort.",
            ],
          }),
          createStep("parent-regulation", {
            guidance: "Notice time-pressure thoughts before escalating.",
            rationale: "A calmer adult is better able to distinguish inability, discomfort, and refusal.",
            phrase: "We are rushed, and I can still use a quiet voice.",
            actions: ["Drop your shoulders, exhale once, and remove any nonessential demand."],
          }),
          createStep("connection", {
            guidance: "Name what appears hard in simple language.",
            rationale: "A tentative observation opens space for a cue you may have missed.",
            phrase: "Getting dressed feels hard. Maybe this shirt is uncomfortable.",
            actions: ["Look for nonverbal signs; do not insist that your guess is correct."],
          }),
          createStep("clear-nonviolent-limit", {
            guidance: "State only the real clothing requirement.",
            rationale: "Clear structure is compatible with flexibility about details.",
            phrase: "We need clothes to go out.",
            actions: ["Avoid fake choices, shame about the child’s body, or threats you will not carry out."],
          }),
          createStep("workable-alternative", {
            guidance: "Offer two acceptable clothes and help if needed.",
            rationale: "A toddler-sized choice supports autonomy while the required task stays clear.",
            phrase: "Blue shirt or green shirt? You try, or I can help.",
            actions: ["Show the options; if choosing fails, calmly help with the necessary task."],
          }),
          createStep("co-regulation", {
            guidance: "Slow the interaction and reduce extra language or sensation.",
            rationale: "Overload makes dressing and decision-making harder.",
            phrase: "One thing at a time. I’m here to help.",
            actions: ["Pause briefly if safe, then guide one clothing step at a time."],
          }),
          createStep("later-learning-repair", {
            guidance: "Adjust the environment and practice the routine outside the rush.",
            rationale: "Use predictability and sensory accommodations to address repeating triggers.",
            phrase: "Tomorrow we’ll put comfy clothes here and do shirt, trousers, then socks.",
            actions: [
              "Remove an avoidable sensory trigger or time-pressure point.",
              "Practice one dressing step when there is no deadline.",
            ],
          }),
        ],
      }),
      "school-age": createAgeContent({
        intro:
          "Ask about sensory comfort, embarrassment, executive load, and the actual school or weather requirement.",
        transitionTip:
          "Prepare acceptable options the night before and use a short morning checklist if helpful.",
        repairPrompt:
          "Review which part of the task failed and collaborate on one practical adjustment.",
        steps: [
          createStep("safety", {
            guidance: "Address only genuine safety needs first, such as weather exposure or a dangerous location.",
            rationale: "A preference disagreement should not be framed as an emergency.",
            phrase: "Let’s first make sure you’ll be safe for the weather and where we’re going.",
            actions: ["Move the discussion away from any immediate hazard and check whether clothing causes pain."],
          }),
          createStep("parent-regulation", {
            guidance: "Pause before labeling the child lazy or defiant.",
            rationale: "Difficulty with sensation, language, or executive skills should not be treated as deliberate misconduct.",
            phrase: "I’m feeling rushed. I’m going to ask what is stuck before I assume why.",
            actions: ["Take one slower exhale and separate essential requirements from personal preference."],
          }),
          createStep("connection", {
            guidance: "Invite the child’s explanation without interrogation.",
            rationale: "School-age children can add useful information once they feel heard.",
            phrase: "Something about getting dressed isn’t working. Is it the feel, the choice, or all the steps?",
            actions: ["Listen for sensory, social, or task-sequencing barriers."],
          }),
          createStep("clear-nonviolent-limit", {
            guidance: "Name the actual requirement and leave irrelevant choices open.",
            rationale: "Reasonable behavioral structure need not control every detail.",
            phrase: "We need weather-safe clothes and we need to leave at eight. You choose the acceptable outfit.",
            actions: ["State the departure time once and avoid body shaming or emotional pressure."],
          }),
          createStep("workable-alternative", {
            guidance: "Offer practical supports rather than a false choice about attending.",
            rationale: "Real choices and external structure can make the task achievable.",
            phrase: "Choose from these two, or tell me one other weather-safe option. I can help with the checklist.",
            actions: ["Use a visual checklist, lay out steps, or help with one difficult fastening if useful."],
          }),
          createStep("co-regulation", {
            guidance: "Reduce commentary and handle one step at a time.",
            rationale: "Fewer demands can help when the child is overloaded.",
            phrase: "We’ll pause the argument. Let’s do just the next step.",
            actions: ["Lower stimulation and allow a short pause if the timetable safely permits."],
          }),
          createStep("later-learning-repair", {
            guidance: "Problem-solve the morning system together.",
            rationale: "Prioritize environmental changes and routines before adding consequences.",
            phrase: "What made dressing hardest today, and what should we set up tonight?",
            actions: [
              "Choose one change such as tag-free clothing, fewer options, or a prepared outfit.",
              "Own any yelling and restate the requirement without blame.",
            ],
          }),
        ],
      }),
      adolescent: createAgeContent({
        intro:
          "Preserve privacy and clothing autonomy wherever possible; separate genuine safety or external requirements from adult taste.",
        transitionTip:
          "Clarify non-negotiable requirements before the rushed moment and let the adolescent control the rest.",
        repairPrompt:
          "Discuss the actual constraint, hear concerns about comfort or identity, and agree on a workable plan.",
        steps: [
          createStep("safety", {
            guidance: "Identify whether there is a real health, weather, or immediate safety concern.",
            rationale: "Adolescent privacy and decision ownership should not be overridden for parental preference.",
            phrase: "I want to separate the actual safety requirement from my opinion about your clothes.",
            actions: ["Do not enter private space or touch the adolescent or their clothing unless immediate safety truly requires it."],
          }),
          createStep("parent-regulation", {
            guidance: "Notice embarrassment, control, or pride before responding.",
            rationale: "Psychological control and shame can harm trust even if they produce immediate compliance.",
            phrase: "I’m getting controlling because I’m worried. I’m going to state the real concern without shaming you.",
            actions: ["Exhale and decide whether the issue is safety, a stated external rule, or merely preference."],
          }),
          createStep("connection", {
            guidance: "Ask for the adolescent’s reasoning and take it seriously.",
            rationale: "Older children need genuine autonomy and a chance to explain comfort, identity, or social concerns.",
            phrase: "I can see this choice matters to you. Tell me what I’m missing.",
            actions: ["Listen without commenting on their body, identity, or character."],
          }),
          createStep("clear-nonviolent-limit", {
            guidance: "State only a legitimate, explainable constraint.",
            rationale: "Boundaries should be tied to safety or a transparent requirement rather than parental pride.",
            phrase: "You control the outfit. The non-negotiable part is footwear that is safe for today’s activity.",
            actions: ["Explain the specific reason and avoid guilt, humiliation, or affection withdrawal."],
          }),
          createStep("workable-alternative", {
            guidance: "Invite an option that meets the real constraint.",
            rationale: "A teenager should have broad decision ownership inside a narrow legitimate boundary.",
            phrase: "Choose any option that meets that requirement, or suggest another way to solve the safety issue.",
            actions: ["Accept the adolescent’s solution if it genuinely meets the stated need."],
          }),
          createStep("co-regulation", {
            guidance: "Stop pursuing the argument and allow privacy where safe.",
            rationale: "Space and respect reduce pressure while preserving the relationship.",
            phrase: "I’ll give you privacy. We can return to the practical question in ten minutes.",
            actions: ["Leave the room or conversation unless a genuine safety issue prevents it."],
          }),
          createStep("later-learning-repair", {
            guidance: "Revisit recurring conflict as a shared practical problem.",
            rationale: "Transparent reasons and negotiated independence are more appropriate than applying toddler scripts.",
            phrase: "How can we prevent this rush while keeping your clothing choices yours?",
            actions: [
              "Agree on which decisions belong entirely to the adolescent and which external requirements are real.",
              "Apologize specifically for any shaming or privacy violation.",
            ],
          }),
        ],
      }),
    },
  }),
  createScenario({
    id: "bedtime",
    title: "Bedtime conflict",
    shortTitle: "Bedtime",
    description:
      "Lower stimulation, hold a predictable routine, and save changes to the plan for a calm conversation.",
    ageContent: {
      toddler: createAgeContent({
        intro:
          "Look first at timing, light, overstimulation, device use, transition difficulty, and need for connection.",
        transitionTip:
          "Use the same short sequence and one small genuine choice, with a predictable connection ritual.",
        repairPrompt:
          "In daylight, practice the bedtime steps and adjust a trigger such as timing or stimulation.",
        steps: [
          createStep("safety", {
            guidance: "Secure immediate hazards before continuing bedtime.",
            rationale: "Climbing, running near stairs, or throwing objects needs a safety response before soothing language.",
            phrase: "I’m keeping your body safe.",
            actions: ["Block access to immediate hazards and move hard or breakable objects using the least intervention needed."],
          }),
          createStep("parent-regulation", {
            guidance: "Slow yourself before adding more commands.",
            rationale: "A quiet, brief response supports a lower-stimulation bedtime environment.",
            phrase: "Slow breath. Soft voice. One step.",
            actions: ["Notice fatigue and the urge to threaten; take one longer exhale."],
          }),
          createStep("connection", {
            guidance: "Name the wish to keep going or stay close.",
            rationale: "Warmth can accompany the bedtime boundary.",
            phrase: "You want more time with me. Stopping is hard.",
            actions: ["Offer the words without asking the child to agree or calm down on command."],
          }),
          createStep("clear-nonviolent-limit", {
            guidance: "State the next routine step, not a distant punishment.",
            rationale: "Toddlers respond better to immediate, concrete structure than delayed consequences.",
            phrase: "It is bedtime. Now we put on pajamas.",
            actions: ["Begin the familiar step calmly and avoid threats of abandonment or withdrawn affection."],
          }),
          createStep("workable-alternative", {
            guidance: "Offer one small, real bedtime choice.",
            rationale: "Choice can support autonomy without implying bedtime itself is optional.",
            phrase: "Blue pajamas or red? One book or one song?",
            actions: ["Show only choices you can honor, then continue the routine."],
          }),
          createStep("co-regulation", {
            guidance: "Lower light and language; offer proximity without forcing touch.",
            rationale: "Reduced stimulation and a calm available adult can help recovery.",
            phrase: "I’m nearby. Your body can slow down.",
            actions: ["Use the usual quiet ritual; do not force cuddling, eye contact, or breathing exercises."],
          }),
          createStep("later-learning-repair", {
            guidance: "Review the routine outside bedtime and rehearse the transition.",
            rationale: "Predictability and practice can reduce the load of the next transition.",
            phrase: "Tonight was hard. Tomorrow we’ll practice bath, pajamas, book, bed.",
            actions: ["Change one environmental trigger and use the same sequence the next night."],
          }),
        ],
      }),
      "school-age": createAgeContent({
        intro:
          "Check timing, light, device use, transition demands, overstimulation, and need for connection; use a predictable routine and problem-solve when calm.",
        transitionTip:
          "Agree ahead of time on device stopping, the routine sequence, and a small choice within it.",
        repairPrompt:
          "Review the pattern the next day and choose one change that protects both connection and sleep.",
        steps: [
          createStep("safety", {
            guidance: "Address unsafe behavior or environmental hazards first.",
            rationale: "Safety is the only issue that needs solving before everyone is calmer.",
            phrase: "I’m moving this out of the way so nobody gets hurt. Then we’ll pause.",
            actions: ["Create distance from hazards or between people if the conflict has become physical."],
          }),
          createStep("parent-regulation", {
            guidance: "Notice your own end-of-day overload.",
            rationale: "Naming the urge to lecture helps you choose a shorter response.",
            phrase: "I’m tired and tempted to argue. I’ll keep this calm and brief.",
            actions: ["Take one slower exhale and choose the single next routine step."],
          }),
          createStep("connection", {
            guidance: "Recognize the child’s wish or worry.",
            rationale: "Being heard does not make the routine optional.",
            phrase: "You’re not ready to stop, and it seems like you want more time together.",
            actions: ["Listen briefly for a fear, unfinished task, or connection need."],
          }),
          createStep("clear-nonviolent-limit", {
            guidance: "Restate the agreed bedtime boundary once.",
            rationale: "A consistent routine is clearer than repeated bargaining or threats.",
            phrase: "The bedtime routine starts now. We can review the timing tomorrow, not during the argument.",
            actions: ["Follow the transparent routine without adding an unplanned punishment."],
          }),
          createStep("workable-alternative", {
            guidance: "Offer a small real choice about the routine or recovery.",
            rationale: "The alternative should work within the boundary rather than reopen it.",
            phrase: "Would you like to read alone or have me read with you?",
            actions: ["Honor either choice and move to the next predictable step."],
          }),
          createStep("co-regulation", {
            guidance: "Make the environment quieter and reduce conversation.",
            rationale: "Reasoning and teaching can wait until arousal is lower.",
            phrase: "We can be quiet now. I’ll stay nearby while things settle.",
            actions: ["Dim stimulation, pause debate, and avoid demanding an apology."],
          }),
          createStep("later-learning-repair", {
            guidance: "Problem-solve the routine together the next day.",
            rationale: "School-age children can help identify triggers and practice a plan when calm.",
            phrase: "Which part of bedtime keeps getting stuck, and what could make it easier tonight?",
            actions: [
              "Choose one realistic routine or environmental change.",
              "Repair any adult yelling without blaming the child for it.",
            ],
          }),
        ],
      }),
      adolescent: createAgeContent({
        intro:
          "Respect growing responsibility and privacy; explain the sleep or household concern and negotiate genuine zones of control.",
        transitionTip:
          "Agree on responsibilities and quiet-hours expectations at a neutral time, with a planned review.",
        repairPrompt:
          "Ask the adolescent to propose a plan that addresses sleep, morning responsibilities, and household impact.",
        steps: [
          createStep("safety", {
            guidance: "Separate immediate safety from an ordinary disagreement about timing.",
            rationale: "A bedtime dispute is not automatically an emergency; intervene physically only for actual immediate danger.",
            phrase: "Nobody is in immediate danger, so I’m going to lower the intensity of this conversation.",
            actions: ["If threats or violence occur, create distance and use the safeguarding plan."],
          }),
          createStep("parent-regulation", {
            guidance: "Check the urge to control sleep by force or shame.",
            rationale: "Clear household limits can be stated without controlling the adolescent’s private experience.",
            phrase: "I’m worried about sleep, and I can explain that without trying to overpower you.",
            actions: ["Exhale slowly and keep the concern separate from criticism of character."],
          }),
          createStep("connection", {
            guidance: "Hear why the current activity or schedule matters.",
            rationale: "Taking the adolescent’s reasoning seriously supports trust.",
            phrase: "I hear that you want control of your own schedule and that you’re finishing something important.",
            actions: ["Listen for the concrete reason before restating the limit."],
          }),
          createStep("clear-nonviolent-limit", {
            guidance: "Tie any firm boundary to a transparent sleep, safety, or shared-household reason.",
            rationale: "Older children need reasons and genuine independence, not arbitrary obedience.",
            phrase: "You don’t have to agree. Quiet hours start now because others need sleep; we’ll review your own bedtime tomorrow.",
            actions: ["Enforce only the stated shared-household limit and preserve privacy otherwise."],
          }),
          createStep("workable-alternative", {
            guidance: "Offer a meaningful way to finish or defer the activity.",
            rationale: "A real option respects autonomy without abandoning the shared rule.",
            phrase: "You can save and stop now, or finish silently by the agreed cutoff. Which works?",
            actions: ["Accept either option if it genuinely fits the safety and household boundary."],
          }),
          createStep("co-regulation", {
            guidance: "Allow space and end the repetitive debate.",
            rationale: "Privacy and reduced language can help both people return to baseline.",
            phrase: "We’ll pause. I’ll give you space, and we will talk at the time we agreed.",
            actions: ["Stop following, lecturing, or demanding emotional agreement."],
          }),
          createStep("later-learning-repair", {
            guidance: "Invite a plan with real adolescent ownership and observable responsibilities.",
            rationale: "Autonomy can expand while shared safety and family needs remain visible.",
            phrase: "Propose a schedule that protects your sleep, mornings, and the rest of the household.",
            actions: [
              "Agree on a trial and a review date rather than assuming the rule can never change.",
              "Own any threats, shaming, or yelling without adding “but you made me.”",
            ],
          }),
        ],
      }),
    },
  }),
  createScenario({
    id: "sibling-conflict",
    title: "Sibling conflict",
    shortTitle: "Sibling conflict",
    description:
      "Separate and protect first, hear each account later, and help siblings repair without forced forgiveness.",
    ageContent: {
      toddler: createAgeContent({
        intro:
          "Toddlers need an adult to separate bodies, protect the object or person, and model a very simple turn or space signal.",
        transitionTip:
          "Reduce crowding, duplicate a high-conflict item where practical, and stay close during predictable friction.",
        repairPrompt:
          "Model one next-time phrase and help restore the toy or check on the other child without forced affection.",
        steps: [
          createStep("safety", {
            guidance: "Separate the children and stop harm without first deciding who started it.",
            rationale: "Safety comes before assigning guilt on incomplete evidence.",
            phrase: "I won’t let you hurt each other. I’m moving you apart.",
            actions: [
              "Move one child or the contested object to create safe distance.",
              "Use only the least physical intervention needed to prevent immediate harm.",
            ],
          }),
          createStep("parent-regulation", {
            guidance: "Pause before blaming the louder or more active child.",
            rationale: "A calm adult can observe and respond without shame or assumptions.",
            phrase: "First safety, then I can learn what happened.",
            actions: ["Take one slower exhale and lower your voice."],
          }),
          createStep("connection", {
            guidance: "Give each child a brief, tentative perspective.",
            rationale: "Competing needs can both be acknowledged without deciding the facts immediately.",
            phrase: "You wanted the toy. You wanted it back. That was hard.",
            actions: ["Use neutral observations and allow either child to reject your guess."],
          }),
          createStep("clear-nonviolent-limit", {
            guidance: "State the shared rule simply.",
            rationale: "The same clear limit can protect both children.",
            phrase: "No hurting bodies. No breaking things.",
            actions: ["Keep the children or object apart until safety can hold."],
          }),
          createStep("workable-alternative", {
            guidance: "Model a toddler-sized request or exit.",
            rationale: "Simple words and gestures are more usable than a demand to share perfectly.",
            phrase: "Say “turn,” “stop,” or come get me.",
            actions: ["Demonstrate the word or gesture once; help organize a turn only when both are ready."],
          }),
          createStep("co-regulation", {
            guidance: "Help each child recover separately if needed.",
            rationale: "Do not require an immediate face-to-face resolution.",
            phrase: "You can calm over here. I’m staying close.",
            actions: ["Lower stimulation and do not force touch, eye contact, sharing, or apologies."],
          }),
          createStep("later-learning-repair", {
            guidance: "Practice the safe signal and restore the situation with adult help.",
            rationale: "Use concrete repair and rehearsal without requiring forgiveness or affection.",
            phrase: "Let’s practice “my turn next,” then help put the toy back together.",
            actions: [
              "Rehearse one short next-time phrase.",
              "Offer a concrete repair without making either child perform affection.",
            ],
          }),
        ],
      }),
      "school-age": createAgeContent({
        intro:
          "Stop harm and property damage, hear accounts separately when calm, and help negotiate access or space.",
        transitionTip:
          "Agree on a shared no-harm rule, a help signal, and a plan for recurring disputes over space or possessions.",
        repairPrompt:
          "Identify each need, repair damage, and rehearse the signal or negotiation for next time.",
        steps: [
          createStep("safety", {
            guidance: "Separate siblings and secure dangerous or breakable objects.",
            rationale: "No one should remain exposed to harm while the adult decides fault.",
            phrase: "Separate now. I won’t let bodies or property be harmed.",
            actions: ["Move children to different safe spaces and check for injury."],
          }),
          createStep("parent-regulation", {
            guidance: "Resist conducting an immediate trial.",
            rationale: "Incomplete evidence and adult anger can turn investigation into blame.",
            phrase: "I will hear both accounts later. Right now I’m calming myself and keeping space.",
            actions: ["Take one slower exhale and postpone consequences or conclusions."],
          }),
          createStep("connection", {
            guidance: "Acknowledge that both children may have a legitimate need.",
            rationale: "Recognizing competing needs does not excuse harmful conduct.",
            phrase: "One of you wanted privacy and one wanted access. Both of you are upset.",
            actions: ["Use neutral language and avoid declaring a winner while emotions are high."],
          }),
          createStep("clear-nonviolent-limit", {
            guidance: "State the shared behavior boundary.",
            rationale: "A predictable rule protects people and property without controlling feelings.",
            phrase: "You may disagree. No hitting, threats, name-calling, or damaging things.",
            actions: ["Maintain separation if either child cannot yet keep the shared rule."],
          }),
          createStep("workable-alternative", {
            guidance: "Offer a pause, adult help, or a structured negotiation later.",
            rationale: "Children need a usable route out of conflict, not only a prohibition.",
            phrase: "Take space now, or ask me to hold the item. We can work out turns when you’re calm.",
            actions: ["Secure the disputed item neutrally if needed and set a time to revisit it."],
          }),
          createStep("co-regulation", {
            guidance: "Support recovery separately and stop cross-room arguing.",
            rationale: "Lower stimulation before asking children to hear one another.",
            phrase: "You do not need to solve or forgive this yet. First, recover in separate spaces.",
            actions: ["Stay available without forcing eye contact, proximity, or apology."],
          }),
          createStep("later-learning-repair", {
            guidance: "Hear each account, identify needs, then negotiate repair and a next-time signal.",
            rationale: "Problem-solving works better when both children can participate.",
            phrase: "What did you need, what was harmed, and what signal can you use before it gets this far?",
            actions: [
              "Help negotiate access, space, or turns.",
              "Repair property or relational harm without forcing immediate forgiveness.",
            ],
          }),
        ],
      }),
      adolescent: createAgeContent({
        intro:
          "Protect safety and privacy, hear each adolescent independently, and avoid using family hierarchy to dismiss either account.",
        transitionTip:
          "Set transparent agreements about shared space, belongings, privacy, and how to request adult mediation.",
        repairPrompt:
          "Let each person describe impact and propose boundaries, restitution, and a next-time exit or mediation signal.",
        steps: [
          createStep("safety", {
            guidance: "Separate people, protect property, and use outside support for significant danger.",
            rationale: "Severe aggression requires safeguarding rather than family mediation in the moment.",
            phrase: "This stops now. Move to separate spaces; I won’t allow threats, violence, or damage.",
            actions: [
              "Create safe distance without demanding an immediate joint conversation.",
              "If anyone remains in significant danger, stop the guide and contact appropriate emergency or safeguarding support.",
            ],
          }),
          createStep("parent-regulation", {
            guidance: "Notice loyalties, assumptions, and the urge to decide instantly.",
            rationale: "A calmer adult is less likely to shame or impose a false resolution.",
            phrase: "I’m not deciding the whole story while we’re escalated. I’m focusing on safety.",
            actions: ["Lower your voice, exhale, and defer non-urgent consequences."],
          }),
          createStep("connection", {
            guidance: "Recognize competing perspectives without endorsing harmful action.",
            rationale: "Take each adolescent’s reasoning seriously and preserve privacy.",
            phrase: "I hear that each of you believes an important boundary was crossed. I’ll listen separately.",
            actions: ["Offer private, separate opportunities to talk after recovery."],
          }),
          createStep("clear-nonviolent-limit", {
            guidance: "Keep the limit tied to safety, threats, privacy, and property.",
            rationale: "Firm behavioral boundaries do not require emotional agreement.",
            phrase: "You may stay angry and disagree. No violence, threats, harassment, or property damage.",
            actions: ["Keep temporary separation or access boundaries as needed for safety."],
          }),
          createStep("workable-alternative", {
            guidance: "Offer genuine adult-like exits and mediation choices.",
            rationale: "A workable alternative gives adolescents ownership of a nonviolent path.",
            phrase: "Use separate spaces, message me for mediation, or write your proposal before we meet.",
            actions: ["Agree on a check-in method and time; respect a safe request not to meet jointly yet."],
          }),
          createStep("co-regulation", {
            guidance: "Preserve space and reduce contact while arousal falls.",
            rationale: "Do not force reconciliation, forgiveness, or emotional performance.",
            phrase: "No one has to resolve or forgive this tonight. Keep space and I’ll check in separately.",
            actions: ["Do not force eye contact, touch, a joint meeting, or an apology."],
          }),
          createStep("later-learning-repair", {
            guidance: "Support accountable repair and a specific future boundary, with help if risk persists.",
            rationale: "Restoration should address actual impact while preserving each person’s voice and safety.",
            phrase: "What impact needs repair, what boundary is needed, and how will you exit or get help next time?",
            actions: [
              "Agree on restitution, privacy, shared-space rules, and a mediation signal.",
              "Seek appropriate clinical or safeguarding support if threats or aggression are severe or chronic.",
            ],
          }),
        ],
      }),
    },
  }),
]);

export const EVIDENCE_ENTRIES = deepFreeze([
  {
    intervention: "Parent Management Training (PMT)",
    evidenceTier: "Strong causal support for disruptive behavior and parenting skills",
    population:
      "Caregivers and children in clinical disruptive-behavior trials; effects vary with age and problem severity.",
    outcome:
      "A 25-RCT clinical meta-analysis reported about g=0.64 for disruptive behavior and g=0.83 for parenting skills. PMT teaches positive attention, concise instructions, transparent contingencies, practice, and problem-solving.",
    limitation:
      "Effects depend on comparator, age, severity, and assessment method; parent and teacher ratings can differ. PMT evidence does not by itself establish attachment security.",
  },
  {
    intervention: "Parent–Child Interaction Therapy (PCIT)",
    evidenceTier: "Strong causal support for disruptive behavior in clinical comparisons",
    population:
      "Caregiver–child dyads seeking help for disruptive behavior, using live therapist coaching.",
    outcome:
      "The 25-RCT clinical meta-analysis reported about g=1.22 for disruptive behavior versus waiting-list controls. PCIT combines a child-directed relationship phase with parent-directed clear-command and discipline practice.",
    limitation:
      "The pooled estimate is versus waiting list and may be smaller against active treatment. Some standard protocols use structured time-out; families should discuss fit and options rather than assume every protocol matches their preferences.",
  },
  {
    intervention: "VIPP-SD",
    evidenceTier: "25-RCT meta-analytic evidence; benefits are outcome-specific and modest",
    population:
      "More than 2,000 caregivers across trials of video-feedback support for sensitivity and sensitive discipline.",
    outcome:
      "Pooled estimates were about r=0.18 for parenting behavior, r=0.16 for parenting attitudes, and r=0.23 for child attachment security.",
    limitation:
      "The externalizing-behavior estimate was small and statistically unconvincing (about r=0.07). Trained practitioners and recordings of real interactions are required; recordings need specific permission and restricted, minimized retention.",
  },
  {
    intervention: "Emotion coaching (Tuning in to Toddlers / Kids / Teens)",
    evidenceTier: "Meaningful randomized-trial evidence for emotion-related parenting outcomes",
    population:
      "The toddler cluster RCT included 300 parents of children aged 18–36 months; other trials extend to older children and adolescents.",
    outcome:
      "The toddler trial improved parent regulation, empathy, emotion coaching, reduced dismissing, and parent-reported child functioning at 12 months; hair cortisol showed a small intervention-related reduction.",
    limitation:
      "Child outcomes often share the parent reporter, which may inflate agreement. Direct evidence is weaker than clinical PMT for high-severity aggression or disruption.",
  },
  {
    intervention: "Mindful parenting",
    evidenceTier: "Promising and increasingly credible, with randomized and review evidence",
    population:
      "A 2019 review covered 25 independent studies; a 2026 trial randomized 189 parents of children aged 6–12 to mindful parenting, PMT, or wait list.",
    outcome:
      "Controlled studies in the 2019 review showed parenting-stress improvement around g=0.44. The 2026 trial found small-to-moderate benefits, with a distinctive benefit for parental emotional competence.",
    limitation:
      "The older evidence base included uncontrolled studies, heterogeneity, and risk of bias. The 2026 trial followed participants for only two months, and mindful parenting is not interchangeable with concrete behavioral practice.",
  },
  {
    intervention: "Nonviolent Communication (NVC)",
    evidenceTier: "Preliminary, limited direct parenting evidence",
    population:
      "Small parenting-group studies, including a 2023 Iranian semi-experiment with 30 parents and a later Hong Kong controlled quasi-experiment.",
    outcome:
      "The Hong Kong study found decreased permissiveness with limited change elsewhere. The Iranian study reported reduced parent–child conflict and improved parental competence.",
    limitation:
      "The Hong Kong outcome was parent-reported; samples were small and local, with limited follow-up and replication. NVC should not be given the evidence status of PMT, PCIT, VIPP-SD, or established emotion-coaching programs.",
  },
]);

export const EVIDENCE_CONTEXT = deepFreeze({
  heading: "Practices have evidence; “gentle parenting” is not a validated package",
  summary:
    "This seven-step guide synthesizes components from several research traditions. It is not itself a branded or separately tested intervention, and the “gentle parenting” label has very low causal evidence as a package.",
  principle:
    "The evidence converges on connection plus structure: warmth and sensitivity, parent regulation, emotion coaching, autonomy support, clear nonviolent boundaries, transparent follow-through, and repair.",
});

export const PRACTICE_WEEKS = deepFreeze([
  {
    week: 1,
    theme: "Awareness before intervention",
    actions: [
      "Take a two-minute daily check-in: notice body signals, automatic interpretations, and environmental constraints.",
      "Practice one pause and slower exhale during a low-stakes conflict.",
      "Give ten minutes of undivided, non-corrective attention once each day.",
      "Track one recurring behavior neutrally: what happened, what came before, and what followed.",
    ],
    measurementAction:
      "Record the six measures as a starting pattern; describe rather than trying to improve every item at once.",
  },
  {
    week: 2,
    theme: "Connection plus limits",
    actions: [
      "Choose two predictable friction points and write one validation sentence and one concise boundary for each.",
      "Rehearse the phrases outside conflict and offer only genuine choices.",
      "Add a routine, transition warning, visual support, or environmental change before adding consequences.",
      "Ask what feels fair or unfair in age-appropriate language and listen before responding.",
    ],
    measurementAction:
      "Log the same six measures and note whether a prepared connection-plus-limit response was used.",
  },
  {
    week: 3,
    theme: "Teach alternatives and practice repair",
    actions: [
      "Choose one replacement skill for one recurring behavior.",
      "Model and rehearse it while everyone is calm; notice specific successful attempts.",
      "Repair one imperfect adult response with clear accountability.",
      "Check consistency among caregivers where possible; remove guilt-based messages and empty threats.",
    ],
    measurementAction:
      "Log the same six measures and note whether the replacement skill and a repair were attempted.",
  },
  {
    week: 4,
    theme: "Review, adapt, and sustain",
    actions: [
      "Compare the full four weeks rather than relying on a single good or difficult day.",
      "Ask what changed, what did not, and whether any demand was unrealistic.",
      "Keep one or two changes that improved family life.",
      "Seek appropriate support if conflict remains severe, chronic, or dangerous.",
    ],
    measurementAction:
      "Review all six measures, write one neutral observation about the pattern, and choose the next support or practice step.",
  },
]);

export const METRICS = deepFreeze([
  {
    id: "frequency",
    label: "Difficult-moment frequency",
    prompt: "How many times did the chosen behavior happen this week?",
    input: "count",
    unit: "events",
  },
  {
    id: "severity",
    label: "Severity",
    prompt: "How intense or harmful were the difficult moments this week?",
    input: "brief-rating-and-note",
    unit: "your consistent weekly rating",
  },
  {
    id: "recovery-time",
    label: "Recovery time",
    prompt: "About how long did it take to return to usual activity after a typical difficult moment?",
    input: "duration",
    unit: "minutes",
  },
  {
    id: "adult-yelling",
    label: "Adult yelling",
    prompt: "How many difficult moments included adult yelling?",
    input: "count",
    unit: "events",
  },
  {
    id: "repair-quality",
    label: "Repair quality",
    prompt: "What repair was attempted, and did it include adult accountability and concrete restoration or practice?",
    input: "brief-rating-and-note",
    unit: "your consistent weekly rating",
  },
  {
    id: "parent-stress",
    label: "Parent stress",
    prompt: "How stressed did caregiving feel overall this week?",
    input: "brief-rating-and-note",
    unit: "your consistent weekly rating",
  },
]);

export const MEASUREMENT_LOOP = deepFreeze({
  title: "Four-week observation loop",
  description:
    "Record the same six measures once each week, review patterns rather than perfection, and use the result to keep, adapt, or seek support. These reflection logs are not validated clinical scales and do not diagnose a child or caregiver.",
  cadence: "Once weekly for four weeks",
  metricIds: METRICS.map((metric) => metric.id),
  weeks: PRACTICE_WEEKS.map(({ week, theme, measurementAction }) => ({
    week,
    theme,
    measurementAction,
  })),
});

export const SAFEGUARDING = deepFreeze({
  heading: "Know when to stop the guide and get help",
  immediateDanger:
    "If anyone is in immediate or significant danger, stop this guide, move to safety where possible, and contact appropriate local emergency or safeguarding support.",
  assessment:
    "Severe aggression, suspected abuse, family violence, acute suicidality, severe uncontrolled caregiver mental-health conditions, or other significant danger require appropriate clinical assessment and safeguarding. Generic self-help is not enough for these situations.",
  flags: [
    {
      id: "severe-aggression",
      label: "Severe aggression",
      copy: "Aggression is severe or creates significant danger.",
    },
    {
      id: "suspected-abuse",
      label: "Suspected abuse",
      copy: "There is concern that a child or another family member is being abused.",
    },
    {
      id: "family-violence",
      label: "Family violence",
      copy: "There is violence or significant danger within the family.",
    },
    {
      id: "acute-suicidality",
      label: "Acute suicidality",
      copy: "A child, adolescent, or caregiver may be acutely suicidal.",
    },
    {
      id: "caregiver-mental-health",
      label: "Severe uncontrolled caregiver mental-health condition",
      copy: "A caregiver’s condition is uncontrolled enough to compromise safe care or immediate judgment.",
    },
    {
      id: "significant-danger",
      label: "Other significant danger",
      copy: "Any other situation creates significant or immediate danger to a child, caregiver, or another person.",
    },
  ],
});

export const PRODUCT_GUARDRAILS = deepFreeze({
  disclaimer:
    "This educational guide is not therapy, diagnosis, or a substitute for clinical care. It offers a research-grounded way to pause and plan; it cannot assess your family’s safety or needs.",
  protocolStatus:
    "The seven-step sequence is a synthesis of tested components, not a branded or separately trialed treatment protocol.",
  recordings:
    "This guide does not need audio or video recordings and should not retain them by default. Any future recording feature would require specific permission, minimized retention, restricted access, and clear disclosure of secondary uses.",
  nonviolence:
    "Do not use hitting, humiliation, abandonment threats, affection withdrawal, fear-based threats, guilt, or lies. Use only the least physical intervention needed for immediate safety.",
});

export const getScenario = (scenarioId) =>
  SCENARIOS.find((scenario) => scenario.id === scenarioId) ?? null;

export const getScenarioAgeContent = (scenarioId, ageId) => {
  const scenario = getScenario(scenarioId);
  return scenario?.ageContent?.[ageId] ?? null;
};

const content = deepFreeze({
  ageBands: AGE_BANDS,
  stepDefinitions: STEP_DEFINITIONS,
  scenarios: SCENARIOS,
  evidenceEntries: EVIDENCE_ENTRIES,
  evidenceContext: EVIDENCE_CONTEXT,
  practiceWeeks: PRACTICE_WEEKS,
  metrics: METRICS,
  measurementLoop: MEASUREMENT_LOOP,
  safeguarding: SAFEGUARDING,
  productGuardrails: PRODUCT_GUARDRAILS,
});

export default content;
