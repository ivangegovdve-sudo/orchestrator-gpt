import { loadClaimEvidence, CLAIM_LINKS, evidenceUrl } from "./claim-data.js";

const host = document.querySelector("#comparison");
if (host) {
  let evidence = null,
    loading = false,
    pair = "audio",
    expanded = false,
    selectedUnit = "image",
    unitChosen = false,
    pairChosen = false;
  const PAIRS = {
    audio: ["elevenlabs", "cartesia"],
    media: ["kie", "fal"],
    text: ["crazyrouter", "openrouter"],
  };
  const priced = (name) =>
    PAIRS[name].every((id) =>
      evidence?.providers?.find((p) => p.id === id)?.rows?.length,
    );
  // A catalogue can be read while its price table is not; say which happened.
  const missingPrice = (provider, name) =>
    Number.isSafeInteger(provider?.population?.listed) &&
    provider.population.listed > 0
      ? `${name}’s catalogue was read (${provider.population.listed.toLocaleString("en")} models), but its public price table was not, so no ${name} price is shown. Unknown does not mean free.`
      : "No price observation acquired. Unknown does not mean free.";
  const names = {
    kie: "KIE",
    fal: "fal",
    crazyrouter: "Crazyrouter",
    openrouter: "OpenRouter",
    elevenlabs: "ElevenLabs",
    cartesia: "Cartesia",
  };
  const element = (tag, value, cls) => {
    const node = document.createElement(tag);
    if (value != null) node.textContent = value;
    if (cls) node.className = cls;
    return node;
  };
  const date = (value) =>
    value && Number.isFinite(Date.parse(value))
      ? new Date(value).toLocaleString("en-GB", {
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        })
      : "date unavailable";
  const money = (value) =>
    value != null && value !== "" && Number.isFinite(Number(value))
      ? new Intl.NumberFormat("en", {
          style: "currency",
          currency: "USD",
          maximumSignificantDigits: 8,
        }).format(Number(value))
      : "Unknown";
  const condition = (value) =>
    value && typeof value === "object"
      ? [value.details, value.variant, value.name?.replaceAll("_", " ")]
          .filter(Boolean)
          .join(" · ")
      : value || "Conditions not reported.";
  const unit = (value) =>
    ({
      video_second: "video second",
      image: "image",
      megapixel: "megapixel",
      video: "video",
    })[value] || value;
  const unitControl = element("div", null, "claim-unit-control");
  const unitLabel = element("label", "Read a common billing unit");
  unitLabel.htmlFor = "claim-price-unit";
  const unitSelect = element("select");
  unitSelect.id = "claim-price-unit";
  const units = {
    image: "Images · USD / image",
    video_second: "Video seconds · USD / second",
    video: "Videos · USD / video",
    megapixel: "Megapixels · USD / megapixel",
    all: "All native units",
  };
  for (const [value, label] of Object.entries(units)) {
    const option = element("option", label);
    option.value = value;
    unitSelect.append(option);
  }
  unitSelect.value = selectedUnit;
  unitControl.append(unitLabel, unitSelect);
  host.before(unitControl);
  unitSelect.addEventListener("change", () => {
    selectedUnit = unitSelect.value;
    unitChosen = true;
    expanded = false;
    render();
  });
  function render() {
    const ids = PAIRS[pair] || PAIRS.media;
    host.replaceChildren();
    unitControl.hidden = pair !== "media";
    document.querySelector("[data-claim-file-tab]").textContent = ids
      .map((id) => names[id])
      .join(" / ");
    for (const id of ids) {
      const provider = evidence?.providers.find((p) => p.id === id);
      const column = element("article", null, "provider-column"),
        heading = element("header");
      heading.append(
        element("h3", names[id]),
        element("span", id === "kie" ? "K" : "↗", "provider-code"),
      );
      column.append(heading);
      const caption =
        provider?.freshness === "snapshot"
          ? `Dated snapshot · ${date(provider.readAt)}`
          : provider?.freshness === "live"
            ? `Source read · ${date(provider.readAt)}`
            : loading
              ? "Reading source…"
              : "Source unavailable";
      column.append(element("p", caption, "provider-caption"));
      const available = (provider?.rows ?? []).filter(
        (row) =>
          pair === "audio" ||
          pair === "text" ||
          selectedUnit === "all" ||
          row.unit === selectedUnit,
      );
      const rows = available.slice(0, expanded ? 6 : 3);
      for (const row of rows) {
        const item = element("div", null, "price-row"),
          rate = element("div", null, "rate");
        item.append(element("h4", row.name || row.id));
        if (pair === "audio") {
          rate.append(
            element("strong", row.priceLabel || "Unknown"),
            element("span", row.priceUnit || "Published price unknown"),
          );
          item.append(rate);
          item.append(
            element(
              "p",
              row.quality?.value != null
                ? `${row.quality.metric || "MOS"} · ${row.quality.method || "public benchmark"}: ${row.quality.value}`
                : "Voice-quality MOS: unknown",
              "quality-score",
            ),
          );
        } else {
          rate.append(
            element("strong", money(pair === "text" ? row.input : row.amount)),
            element(
              "span",
              pair === "text" ? "input / 1M tokens" : `per ${unit(row.unit)}`,
            ),
          );
          item.append(rate);
        }
        if (pair === "text")
          item.append(
            element(
              "p",
              `${money(row.output)} output / 1M tokens`,
              "output-rate",
            ),
          );
        const short =
          pair === "audio"
            ? row.note || "Published price and public quality evidence; conditions stay attached."
            : id === "crazyrouter"
            ? "Derived · default group. Not settled charges."
            : id === "kie"
              ? "Listed variant. Top-up bonuses excluded."
              : id === "fal"
                ? "Dated public summary. Read its conditions."
                : "Base token rates. Other charges may apply.";
        item.append(element("p", short, "short-condition"));
        const details = element("details");
        details.append(
          element("summary", "Conditions + evidence"),
          element("p", condition(row.condition)),
        );
        if (row.note) details.append(element("p", row.note));
        if (pair === "audio") {
          details.append(
            element(
              "p",
              `Published price source: ${row.priceSourceUrl || "unknown"} · checked ${date(row.priceCheckedAt)}`,
            ),
            element(
              "p",
              row.quality
                ? `${row.quality.metric} source: ${row.quality.sourceUrl} · checked ${date(row.quality.checkedAt)} · ${row.quality.scope}`
                : "MOS source: unknown; no usable public score was retained.",
            ),
          );
        }
        details.append(
          element("code", row.id),
          element(
            "p",
            `${provider.freshness === "snapshot" ? "Snapshot source read" : "Source read"}: ${date(row.readAt)}. Retrieval time is not a price-change date.`,
          ),
          element("code", `${id === "kie" ? "POST" : "GET"} ${row.sourceUrl}`),
        );
        if (id === "crazyrouter")
          details.append(
            element(
              "p",
              row.nativeBilling?.formula ||
                "Calculated from published coefficients.",
            ),
          );
        if (id === "kie")
          details.append(
            element(
              "p",
              "Public paginated pricing feed. Its fal comparison and discount claims are excluded from these prices.",
            ),
          );
        item.append(details);
        if (pair === "audio") {
          for (const [source, label] of [
            [row.priceSourceUrl, "View published price ↗"],
            [row.quality?.sourceUrl, "View MOS source ↗"],
          ]) {
            const url = evidenceUrl(source);
            if (!url) continue;
            const link = element("a", label);
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener";
            item.append(link);
          }
        } else {
          const url = evidenceUrl(
            id === "kie" ? "https://kie.ai/pricing" : row.sourceUrl,
          );
          if (url) {
            const link = element("a", "View pricing ↗");
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener";
            item.append(link);
          }
        }
        column.append(item);
      }
      if (!rows.length)
        column.append(
          element(
            "p",
            loading
              ? "Reading public pricing evidence…"
              : provider?.rows?.length
                ? "No observation in this native unit. Choose another unit; no conversion is assumed."
                : missingPrice(provider, names[id]),
            "missing",
          ),
        );
      if (provider?.refreshError)
        column.append(
          element(
            "p",
            "Live read unavailable; the original snapshot date is preserved.",
            "short-condition",
          ),
        );
      host.append(column);
    }
    document.querySelector("#claim-scope").textContent =
      pair === "audio"
        ? "Prices are native provider units; MOS is a dated UTMOS-predicted public benchmark, not an Open Dashboard synthesis."
        : pair === "media"
          ? "KIE’s linked comparison focuses on Veo 3."
          : "Crazyrouter’s comparison is provider-authored, not an independent verdict.";
    const claim = document.querySelector("#claim-source");
    claim.href = CLAIM_LINKS[pair];
    claim.textContent =
      pair === "audio"
        ? "Read the public TTS benchmark ↗"
        : pair === "media"
          ? "Read KIE’s own claim ↗"
          : "Read Crazyrouter’s own claim ↗";
    const selected = (evidence?.providers ?? []).filter((p) =>
        ids.includes(p.id),
      ),
      live = selected.filter((p) => p.freshness === "live").length,
      snapshots = selected.filter((p) => p.freshness === "snapshot").length;
    document.querySelector("[data-feed-status]").textContent = loading
      ? "Reading public sources…"
      : `${live} current ${live === 1 ? "read" : "reads"} · ${snapshots} dated ${snapshots === 1 ? "snapshot" : "snapshots"}${selected.some((p) => p.freshness === "unavailable") ? " · source unavailable" : ""}`;
    document.querySelector("#read-time").textContent = evidence
      ? `Checked ${date(evidence.checkedAt)} · source dates above`
      : loading
        ? "Source read pending"
        : "No source read available";
    const more = document.querySelector("#all-records");
    more.textContent = expanded
      ? "Show fewer observations −"
      : "Show more observations +";
    more.setAttribute("aria-expanded", String(expanded));
    document.querySelector("#refresh").disabled = loading;
    host.setAttribute("aria-busy", String(loading));
  }
  async function refresh(force = false) {
    if (loading) return;
    loading = true;
    render();
    try {
      evidence = await loadClaimEvidence({ force });
      // Open on a claim both sides of which have retained observations.
      const other = ["audio", "media", "text"].find((candidate) =>
        priced(candidate),
      );
      if (!pairChosen && !priced(pair) && other) selectPair(other);
      if (!unitChosen) {
        const media = evidence.providers.filter((p) =>
          ["kie", "fal"].includes(p.id),
        );
        const common = Object.keys(units).find(
          (unit) =>
            unit !== "all" &&
            media.length === 2 &&
            media.every((p) => p.rows.some((row) => row.unit === unit)),
        );
        selectedUnit = common || "all";
        unitSelect.value = selectedUnit;
      }
    } catch {
      evidence = { checkedAt: new Date().toISOString(), providers: [] };
    } finally {
      loading = false;
      render();
    }
  }
  function selectPair(next) {
    pair = Object.hasOwn(PAIRS, next) ? next : "media";
    expanded = false;
    document.querySelectorAll("[data-pair]").forEach((other) => {
      const selected = other.dataset.pair === pair;
      other.classList.toggle("active", selected);
      other.setAttribute("aria-pressed", String(selected));
      const state = other.querySelector(".claim-state");
      if (state)
        state.textContent = selected ? "Inspecting ↗" : "Inspect claim";
    });
  }
  document.querySelectorAll("[data-pair]").forEach((button) =>
    button.addEventListener("click", () => {
      pairChosen = true;
      selectPair(button.dataset.pair);
      render();
    }),
  );
  document.querySelector("#all-records").addEventListener("click", () => {
    expanded = !expanded;
    render();
  });
  document
    .querySelector("#refresh")
    .addEventListener("click", () => refresh(true));
  refresh();
}
