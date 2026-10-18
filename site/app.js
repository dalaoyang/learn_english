(() => {
  const STORAGE_KEY = "learn_english_mobile_answers_v1";
  const data = window.LESSON_DATA || { days: [] };
  const state = loadState();
  const dayList = document.querySelector("#day-list");
  const lesson = document.querySelector("#lesson");
  const saveState = document.querySelector("#save-state");
  let activeDayId = "";

  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    saveState.textContent = "已自动保存";
    window.clearTimeout(save.timer);
    save.timer = window.setTimeout(() => { saveState.textContent = "自动保存"; }, 1400);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
  }

  function stateKey(dayId, questionId) { return `${dayId}/${questionId}`; }
  function answerFor(questionId, dayId = activeDayId) { return state[stateKey(dayId, questionId)] || { answer: "", confidence: "", evidence: "" }; }

  function renderDayButtons() {
    dayList.innerHTML = data.days.map(day => `
      <button class="day-button" data-day="${escapeHtml(day.id)}" type="button">
        <strong>${escapeHtml(day.label)}</strong>
        <small>${escapeHtml(day.focus)} · ${escapeHtml(day.status)}</small>
      </button>`).join("");
    dayList.addEventListener("click", event => {
      const button = event.target.closest("[data-day]");
      if (button) renderDay(button.dataset.day);
    });
  }

  function renderQuestion(question) {
    const saved = answerFor(question.id);
    const input = question.type === "choice"
      ? `<div class="choice-list">${question.options.map((option, index) => `
          <label class="choice">
            <input type="radio" name="${escapeHtml(question.id)}" value="${index}" ${saved.answer === String(index) ? "checked" : ""} />
            <span>${escapeHtml(option)}</span>
          </label>`).join("")}</div>`
      : `<textarea class="answer-area" data-answer="${escapeHtml(question.id)}" placeholder="写下你的答案，不必先查资料">${escapeHtml(saved.answer)}</textarea>`;
    return `<article class="question" data-question="${escapeHtml(question.id)}">
      <div class="question-head"><span class="question-label">${escapeHtml(question.label)}</span><span class="eyebrow">${question.type === "choice" ? "选择" : "输入"}</span></div>
      <p class="question-prompt">${escapeHtml(question.prompt)}</p>
      ${input}
      <div class="question-tools">
        <div class="confidence" aria-label="把握程度">
          ${["有依据", "不确定", "猜"].map(value => `<button type="button" data-confidence="${escapeHtml(value)}" class="${saved.confidence === value ? "active" : ""}">${escapeHtml(value)}</button>`).join("")}
        </div>
        <textarea class="answer-area evidence" data-evidence="${escapeHtml(question.id)}" placeholder="原文依据（选择题）或最卡的一点">${escapeHtml(saved.evidence)}</textarea>
      </div>
    </article>`;
  }

  function renderDay(dayId) {
    const day = data.days.find(item => item.id === dayId) || data.days[0];
    activeDayId = day.id;
    document.querySelectorAll(".day-button").forEach(button => button.classList.toggle("active", button.dataset.day === day.id));
    const groups = day.groups.length
      ? day.groups.map(group => `<section class="group"><div class="group-heading"><h3>${escapeHtml(group.title)}</h3><span class="group-time">${escapeHtml(group.time)}</span></div>${group.questions.map(renderQuestion).join("")}</section>`).join("")
      : `<div class="empty-state"><span class="empty-icon">✦</span><h2>题目还在准备中</h2><p>先记录计划，不提前显示未作答内容。</p></div>`;
    lesson.innerHTML = `<div class="lesson-top"><div class="lesson-meta"><div><span class="eyebrow">${escapeHtml(day.id)}</span><h2 class="lesson-title">${escapeHtml(day.title)}</h2></div><span class="status-chip">${escapeHtml(day.status)}</span></div><p class="lesson-intro">${escapeHtml(day.intro)}</p></div>${groups}${day.groups.length ? `<div class="lesson-actions"><button class="primary-button" id="copy-answers" type="button">复制本次答案</button><button class="secondary-button" id="clear-day" type="button">清除本日草稿</button></div>` : ""}`;
    bindLesson(day);
  }

  function bindLesson(day) {
    lesson.querySelectorAll("input[type=radio]").forEach(input => input.addEventListener("change", () => {
      const question = input.closest("[data-question]").dataset.question;
      state[stateKey(activeDayId, question)] = { ...answerFor(question), answer: input.value };
      save();
    }));
    lesson.querySelectorAll("[data-answer]").forEach(input => input.addEventListener("input", () => {
      const id = input.dataset.answer;
      state[stateKey(activeDayId, id)] = { ...answerFor(id), answer: input.value };
      save();
    }));
    lesson.querySelectorAll("[data-evidence]").forEach(input => input.addEventListener("input", () => {
      const id = input.dataset.evidence;
      state[stateKey(activeDayId, id)] = { ...answerFor(id), evidence: input.value };
      save();
    }));
    lesson.querySelectorAll("[data-confidence]").forEach(button => button.addEventListener("click", () => {
      const id = button.closest("[data-question]").dataset.question;
      state[stateKey(activeDayId, id)] = { ...answerFor(id), confidence: button.dataset.confidence };
      button.closest(".confidence").querySelectorAll("button").forEach(item => item.classList.toggle("active", item === button));
      save();
    }));
    lesson.querySelector("#copy-answers")?.addEventListener("click", () => copyAnswers(day));
    lesson.querySelector("#clear-day")?.addEventListener("click", () => clearDay(day));
  }

  function copyAnswers(day) {
    const lines = [`${day.label}｜${day.title}`];
    day.groups.flatMap(group => group.questions).forEach(question => {
      const saved = answerFor(question.id, day.id);
      const answer = question.type === "choice" && saved.answer !== "" ? question.options[Number(saved.answer)] : saved.answer;
      lines.push(`${question.label}：${answer || "未答"}｜${saved.confidence || "未标记"}｜依据：${saved.evidence || "未填写"}`);
    });
    navigator.clipboard?.writeText(lines.join("\n"));
    saveState.textContent = "已复制，可粘贴到聊天";
  }

  function clearDay(day) {
    day.groups.flatMap(group => group.questions).forEach(question => delete state[stateKey(day.id, question.id)]);
    save();
    renderDay(day.id);
  }

  renderDayButtons();
  renderDay(new URLSearchParams(location.search).get("day") || data.days[0]?.id);
})();
