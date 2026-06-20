/*
  Adapted for Forest HUB from CalendarGenerator by Franco Mossotto.
  Source: https://github.com/fmossott/CalendarGenerator
  Original work licensed under Apache-2.0.
*/
const HOLIDAY_API_URL = "https://kayaposoft.com/enrico/json/v1.0/";
const STORAGE_KEY = "forestHubCalendarGeneratorConfig";
const PAGE_COUNT = 14;
const MONTH_PAGE_COUNT = 13;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const FORMAT_OPTIONS = {
  A4: { key: "A4", w: "210mm", h: "297mm" },
  A5: { key: "A5", w: "148.5mm", h: "210mm" },
};

const FALLBACK_COUNTRIES = [
  { countryCode: "usa", fullName: "United States", regions: [] },
  { countryCode: "gbr", fullName: "United Kingdom", regions: [] },
  { countryCode: "ita", fullName: "Italy", regions: [] },
  { countryCode: "bgr", fullName: "Bulgaria", regions: [] },
  { countryCode: "deu", fullName: "Germany", regions: [] },
  { countryCode: "fra", fullName: "France", regions: [] },
  { countryCode: "esp", fullName: "Spain", regions: [] },
];

const form = document.getElementById("calendar-form");
const yearInput = document.getElementById("year");
const countrySelect = document.getElementById("country");
const regionSelect = document.getElementById("region");
const formatSelect = document.getElementById("format");
const bleedInput = document.getElementById("bleed");
const statusMessage = document.getElementById("status-message");
const pagesContainer = document.getElementById("calendar-pages");
const imageInputList = document.getElementById("image-input-list");
const imageRowTemplate = document.getElementById("image-row-template");
const refreshButton = document.getElementById("refresh-button");
const sampleButton = document.getElementById("sample-button");
const resetButton = document.getElementById("reset-button");
const printButton = document.getElementById("print-button");

const previewDate = new Date();
previewDate.setMonth(previewDate.getMonth() + 6);
const defaultYear = previewDate.getFullYear();

const state = {
  config: loadConfig(),
  supportedCountries: {},
  holidayCache: new Map(),
  renderToken: 0,
};

buildImageRows();
populateStaticInputs();
attachListeners();
initialize();

async function initialize() {
  await loadSupportedCountries();
  populateDynamicInputs();
  await renderCalendar();
}

function buildDefaultConfig() {
  return {
    year: defaultYear,
    country: "usa",
    region: "",
    format: "A4",
    bleed: 3,
    imgUrl: Array.from({ length: PAGE_COUNT }, (_, index) => `./assets/pics/${String(index).padStart(2, "0")}.jpg`),
    descr: Array.from({ length: PAGE_COUNT }, () => ""),
  };
}

function loadConfig() {
  const defaults = buildDefaultConfig();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const saved = JSON.parse(raw);
    return mergeConfig(saved, defaults);
  } catch {
    return defaults;
  }
}

function mergeConfig(saved, defaults) {
  return {
    ...defaults,
    year: Number.isInteger(saved?.year) ? saved.year : defaults.year,
    country: typeof saved?.country === "string" && saved.country ? saved.country : defaults.country,
    region: typeof saved?.region === "string" ? saved.region : defaults.region,
    format: typeof saved?.format === "string" && FORMAT_OPTIONS[saved.format] ? saved.format : defaults.format,
    bleed: Number.isFinite(saved?.bleed) ? clamp(saved.bleed, 0, 10) : defaults.bleed,
    imgUrl: defaults.imgUrl.map((value, index) => {
      return typeof saved?.imgUrl?.[index] === "string" ? saved.imgUrl[index] : value;
    }),
    descr: defaults.descr.map((value, index) => {
      return typeof saved?.descr?.[index] === "string" ? saved.descr[index] : value;
    }),
  };
}

function saveConfig() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.config));
}

function buildImageRows() {
  imageInputList.innerHTML = "";
  for (let index = 0; index < PAGE_COUNT; index += 1) {
    const row = imageRowTemplate.content.firstElementChild.cloneNode(true);
    row.dataset.index = String(index);
    row.querySelector(".image-url").id = `image-url-${index}`;
    row.querySelector(".image-caption").id = `image-caption-${index}`;
    imageInputList.append(row);
  }
  updateImageLabels();
}

function populateStaticInputs() {
  yearInput.value = String(state.config.year);
  formatSelect.value = state.config.format;
  bleedInput.value = String(state.config.bleed);

  document.querySelectorAll(".image-row").forEach((row) => {
    const index = Number(row.dataset.index);
    row.querySelector(".image-url").value = state.config.imgUrl[index] || "";
    row.querySelector(".image-caption").value = state.config.descr[index] || "";
  });

  updateImageLabels();
  applyPageVariables();
}

function populateDynamicInputs() {
  const countries = Object.values(state.supportedCountries).sort((left, right) => {
    return left.fullName.localeCompare(right.fullName);
  });

  countrySelect.innerHTML = "";
  countries.forEach((country) => {
    const option = document.createElement("option");
    option.value = country.countryCode;
    option.textContent = country.fullName;
    countrySelect.append(option);
  });

  if (!state.supportedCountries[state.config.country]) {
    state.config.country = countries[0]?.countryCode || buildDefaultConfig().country;
    state.config.region = "";
  }

  countrySelect.value = state.config.country;
  populateRegions(state.config.country, state.config.region);
  saveConfig();
}

function populateRegions(countryCode, selectedRegion = "") {
  const country = state.supportedCountries[countryCode];
  const regions = Array.isArray(country?.regions) ? country.regions : [];

  regionSelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = regions.length ? "All regions" : "Nationwide";
  regionSelect.append(allOption);

  regions.forEach((region) => {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = region;
    regionSelect.append(option);
  });

  regionSelect.value = regions.includes(selectedRegion) ? selectedRegion : "";
}

function updateImageLabels() {
  document.querySelectorAll(".image-row").forEach((row) => {
    const index = Number(row.dataset.index);
    row.querySelector(".image-label").textContent = getImageLabel(index);
  });
}

function getImageLabel(index) {
  if (index === 0) {
    return "Cover image";
  }
  const date = new Date(state.config.year, index - 1, 1);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()} image`;
}

function attachListeners() {
  form.addEventListener("change", async (event) => {
    if (event.target === countrySelect) {
      populateRegions(countrySelect.value, "");
    }
    await renderCalendar();
  });

  refreshButton.addEventListener("click", async () => {
    await renderCalendar();
  });

  sampleButton.addEventListener("click", async () => {
    const defaults = buildDefaultConfig();
    document.querySelectorAll(".image-row").forEach((row) => {
      const index = Number(row.dataset.index);
      row.querySelector(".image-url").value = defaults.imgUrl[index];
      row.querySelector(".image-caption").value = defaults.descr[index];
    });
    await renderCalendar();
  });

  resetButton.addEventListener("click", async () => {
    if (!window.confirm("Reset the calendar generator to its default sample setup?")) {
      return;
    }
    state.config = buildDefaultConfig();
    state.holidayCache.clear();
    populateStaticInputs();
    populateDynamicInputs();
    await renderCalendar();
  });

  printButton.addEventListener("click", () => {
    window.print();
  });
}

function syncConfigFromInputs() {
  const defaults = buildDefaultConfig();
  const year = Number.parseInt(yearInput.value, 10);
  const bleed = Number.parseInt(bleedInput.value, 10);

  const imgUrl = defaults.imgUrl.slice();
  const descr = defaults.descr.slice();

  document.querySelectorAll(".image-row").forEach((row) => {
    const index = Number(row.dataset.index);
    imgUrl[index] = row.querySelector(".image-url").value.trim();
    descr[index] = row.querySelector(".image-caption").value.trim();
  });

  state.config = {
    ...state.config,
    year: Number.isInteger(year) ? clamp(year, 1900, 2200) : defaults.year,
    country: countrySelect.value || defaults.country,
    region: regionSelect.value || "",
    format: FORMAT_OPTIONS[formatSelect.value] ? formatSelect.value : defaults.format,
    bleed: Number.isInteger(bleed) ? clamp(bleed, 0, 10) : defaults.bleed,
    imgUrl,
    descr,
  };

  saveConfig();
  applyPageVariables();
  updateImageLabels();
}

async function renderCalendar() {
  syncConfigFromInputs();
  const renderToken = ++state.renderToken;
  setStatus("Refreshing calendar and holiday data...", "info");

  const holidayResult = await loadHolidayMap(state.config.year, state.config.country, state.config.region);
  if (renderToken !== state.renderToken) {
    return;
  }

  renderPages(holidayResult.holidayMap);

  if (holidayResult.warning) {
    setStatus(holidayResult.warning, "warning");
    return;
  }

  const holidayText = holidayResult.holidayCount === 1 ? "holiday" : "holidays";
  setStatus(`Ready to print. Loaded ${holidayResult.holidayCount} ${holidayText} for ${state.config.year}.`, "success");
}

async function loadSupportedCountries() {
  try {
    const countries = await jsonp(HOLIDAY_API_URL, {
      action: "getSupportedCountries",
    });

    if (!Array.isArray(countries) || !countries.length) {
      throw new Error("No countries returned.");
    }

    state.supportedCountries = Object.fromEntries(
      countries.map((country) => [country.countryCode, country])
    );
  } catch {
    state.supportedCountries = Object.fromEntries(
      FALLBACK_COUNTRIES.map((country) => [country.countryCode, country])
    );
    setStatus(
      "Holiday-country lookup is using a local fallback list. Printing still works, but region coverage may be limited until the service responds.",
      "warning"
    );
  }
}

async function loadHolidayMap(year, country, region) {
  const cacheKey = `${year}|${country}|${region}`;
  if (state.holidayCache.has(cacheKey)) {
    return state.holidayCache.get(cacheKey);
  }

  try {
    const [currentYear, nextYear] = await Promise.all([
      jsonp(HOLIDAY_API_URL, {
        action: "getPublicHolidaysForYear",
        year,
        country,
        region,
      }),
      jsonp(HOLIDAY_API_URL, {
        action: "getPublicHolidaysForYear",
        year: year + 1,
        country,
        region,
      }),
    ]);

    const combined = [...normalizeHolidayResponse(currentYear), ...normalizeHolidayResponse(nextYear)];
    const holidayMap = new Map();

    combined.forEach((holiday) => {
      if (!holiday?.date?.year || !holiday?.date?.month || !holiday?.date?.day) {
        return;
      }
      holidayMap.set(toDateKey(holiday.date), holiday.localName || holiday.name || "Holiday");
    });

    const result = {
      holidayMap,
      holidayCount: holidayMap.size,
    };

    state.holidayCache.set(cacheKey, result);
    return result;
  } catch {
    return {
      holidayMap: new Map(),
      holidayCount: 0,
      warning:
        "Holiday service is currently unavailable. Sundays still render and the calendar remains printable without public-holiday labels.",
    };
  }
}

function normalizeHolidayResponse(response) {
  return Array.isArray(response) ? response : [];
}

function renderPages(holidayMap) {
  pagesContainer.innerHTML = "";
  pagesContainer.append(createCoverPage());

  for (let monthIndex = 0; monthIndex < MONTH_PAGE_COUNT; monthIndex += 1) {
    pagesContainer.append(createMonthPage(monthIndex, holidayMap));
  }
}

function createCoverPage() {
  const page = document.createElement("article");
  page.className = "calendar-page cover-page break-after";

  const border = document.createElement("div");
  border.className = "page-border";
  border.append(createImageContainer(0));

  const banner = document.createElement("div");
  banner.className = "cover-banner";

  const kicker = document.createElement("p");
  kicker.className = "cover-kicker";
  kicker.textContent = "Forest HUB";

  const title = document.createElement("h2");
  title.className = "cover-title";
  title.textContent = "Printable Calendar";

  const year = document.createElement("p");
  year.className = "cover-year";
  year.textContent = String(state.config.year);

  banner.append(kicker, title, year);
  border.append(banner);
  page.append(border);
  return page;
}

function createMonthPage(monthOffset, holidayMap) {
  const page = document.createElement("article");
  page.className = "calendar-page break-after";

  const border = document.createElement("div");
  border.className = "page-border";
  border.append(createImageContainer(monthOffset + 1));

  const headerRow = document.createElement("div");
  headerRow.className = "month-row";

  const monthBox = document.createElement("div");
  monthBox.className = "month-box";

  const monthDate = new Date(state.config.year, monthOffset, 1);
  const title = document.createElement("h3");
  title.className = "month-title";
  title.textContent = MONTH_NAMES[monthDate.getMonth()].toUpperCase();

  const year = document.createElement("p");
  year.className = "month-year";
  year.textContent = String(monthDate.getFullYear());

  monthBox.append(title, year);

  const notes = document.createElement("div");
  notes.className = "notes-lines";
  notes.append(createLine(), createLine(), createLine());

  headerRow.append(monthBox, notes);
  border.append(headerRow);
  border.append(createMonthTable(monthDate, holidayMap));
  page.append(border);

  return page;
}

function createLine() {
  return document.createElement("span");
}

function createImageContainer(index) {
  const wrapper = document.createElement("div");
  wrapper.className = "image-container";

  const image = document.createElement("img");
  image.className = "picture";
  image.alt = index === 0 ? "Calendar cover image" : `${getImageLabel(index)} preview`;
  applyImageSource(image, state.config.imgUrl[index]);

  const description = document.createElement("p");
  description.className = "description";
  const caption = state.config.descr[index] || "\u00A0";
  if (!state.config.descr[index]) {
    description.classList.add("empty-caption");
  }
  description.textContent = caption;

  wrapper.append(image, description);
  return wrapper;
}

function applyImageSource(image, configuredUrl) {
  const fallbackUrl = "./assets/noimg.jpg";
  const resolvedUrl = configuredUrl || fallbackUrl;
  image.src = resolvedUrl;
  image.addEventListener(
    "error",
    () => {
      if (!image.dataset.fallbackApplied) {
        image.dataset.fallbackApplied = "true";
        image.src = fallbackUrl;
      }
    },
    { once: true }
  );
}

function createMonthTable(monthDate, holidayMap) {
  const table = document.createElement("table");
  table.className = "calendar-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  WEEKDAY_NAMES.forEach((weekday) => {
    const cell = document.createElement("th");
    cell.textContent = weekday;
    headRow.append(cell);
  });
  thead.append(headRow);
  table.append(thead);

  const tbody = document.createElement("tbody");
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startDay = new Date(firstDay);
  startDay.setDate(firstDay.getDate() - weekdayIndex(firstDay) + 1);

  for (let rowIndex = 0; rowIndex < 6; rowIndex += 1) {
    const row = document.createElement("tr");

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const date = new Date(startDay);
      date.setDate(startDay.getDate() + (rowIndex * 7) + dayIndex);
      row.append(createDayCell(date, monthDate.getMonth(), holidayMap));
    }

    tbody.append(row);
  }

  table.append(tbody);
  return table;
}

function createDayCell(date, activeMonth, holidayMap) {
  const cell = document.createElement("td");
  const content = document.createElement("div");
  content.className = "day-cell-content";

  const number = document.createElement("span");
  number.className = "day-number";
  number.textContent = String(date.getDate()).padStart(2, "0");
  content.append(number);

  const holidayName = holidayMap.get(toDateKeyFromDate(date));
  if (holidayName) {
    const label = document.createElement("span");
    label.className = "holiday-name";
    label.textContent = holidayName;
    content.append(label);
  }

  if (date.getMonth() !== activeMonth) {
    cell.classList.add("other-month");
  }

  if (date.getDay() === 0 || holidayName) {
    cell.classList.add("free-day");
  }

  cell.append(content);
  return cell;
}

function applyPageVariables() {
  const format = FORMAT_OPTIONS[state.config.format] || FORMAT_OPTIONS.A4;
  const root = document.documentElement;
  root.style.setProperty("--page-width", format.w);
  root.style.setProperty("--page-height", format.h);
  root.style.setProperty("--page-bleed-area", `${state.config.bleed}mm`);
}

function setStatus(message, tone) {
  statusMessage.textContent = message;
  statusMessage.className = `status ${tone}`;
}

function weekdayIndex(date) {
  const index = date.getDay();
  return index === 0 ? 7 : index;
}

function toDateKey(dateInfo) {
  return `${dateInfo.year}-${String(dateInfo.month).padStart(2, "0")}-${String(dateInfo.day).padStart(2, "0")}`;
}

function toDateKeyFromDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function jsonp(url, params) {
  return new Promise((resolve, reject) => {
    const callbackName = `calendarGeneratorJsonp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const query = new URLSearchParams({
      ...params,
      jsonp: callbackName,
    });
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Request timed out."));
    }, 12000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete window[callbackName];
    }

    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };

    script.src = `${url}?${query.toString()}`;
    script.async = true;
    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP request failed."));
    };
    document.body.append(script);
  });
}
