import { createNanoEvents } from "nanoevents";

/* State and events */
const bus = createNanoEvents();
const $ = (s) => document.querySelector(s);

const els = {
  goal: $("#goal"),
  audience: $("#audience"),
  tone: $("#tone"),
  constraints: $("#constraints"),
  variables: $("#variables"),
  format: $("#format"),
  generate: $("#generate"),
  example: $("#example"),
  output: $("#output"),
  copy: $("#copy"),
  presets: $("#presets"),
  save: $("#save"),
  share: $("#share"),
  toast: $("#toast"),
};

const STORAGE_KEY = "super-prompt-presets-v1";

/* Presets */
function loadPresets() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const list = raw ? JSON.parse(raw) : [];
  els.presets.innerHTML = "";
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "Load preset…";
  els.presets.appendChild(defaultOpt);
  list.forEach((p, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = p.name || `Preset ${i + 1}`;
    els.presets.appendChild(o);
  });
}
function savePreset(name, content) {
  const raw = localStorage.getItem(STORAGE_KEY);
  const list = raw ? JSON.parse(raw) : [];
  list.unshift({ name, content, ts: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 30)));
  loadPresets();
}
loadPresets();

/* Toast */
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 1600);
}

/* Example fill */
els.example.addEventListener("click", () => {
  els.goal.value = "Write a high-converting product description for a double-walled stainless steel water bottle.";
  els.audience.value = "Eco-conscious shoppers, ages 20–40";
  els.tone.value = "Clear, confident, benefit-led, no hype";
  els.constraints.value = "120–150 words. Include 3 short bullets (max 10 words each). Avoid clichés and jargon.";
  els.variables.value = "{product_name}, {capacity}, {key_features}, {price}";
  els.format.value = "Return markdown with a bold headline, then 3 bullets, then a short paragraph.";
  toast("Example loaded");
});

/* Generate with AI */
els.generate.addEventListener("click", async () => {
  const goal = els.goal.value.trim();
  if (!goal) {
    toast("Please add a goal");
    return;
  }
  els.generate.disabled = true;
  const audience = els.audience.value.trim();
  const tone = els.tone.value.trim();
  const constraints = els.constraints.value.trim();
  const variables = els.variables.value.trim();
  const format = els.format.value.trim();

  try {
    const sys = `You are an expert prompt engineer. Create a reusable "super prompt" for copywriting.
The output must be a single text block designed to be pasted directly into an AI chat.
Use clear headings, bullet points, and variable placeholders as provided.
Include:
- Role and purpose
- Inputs as variables (echo user variables; add any missing obvious ones)
- Style/tone guidelines
- Constraints and quality criteria
- Step-by-step process the AI should follow
- Output format instructions
- A short checklist the AI uses to self-review before final output`;

    const user = [
      `Goal: ${goal}`,
      audience ? `Audience: ${audience}` : null,
      tone ? `Tone: ${tone}` : null,
      constraints ? `Constraints: ${constraints}` : null,
      variables ? `Variables: ${variables}` : `Variables: {title}`,
      format ? `Format: ${format}` : null,
    ].filter(Boolean).join("\n");

    const completion = await websim.chat.completions.create({
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    });

    els.output.value = (completion && completion.content) ? completion.content.trim() : "No response. Try again.";
  } catch (e) {
    console.error(e);
    toast("Generation failed");
  } finally {
    els.generate.disabled = false;
  }
});

/* Copy to clipboard */
els.copy.addEventListener("click", async () => {
  const text = els.output.value.trim();
  if (!text) { toast("Nothing to copy"); return; }
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  } catch {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    toast("Copied");
  }
});

/* Save preset */
els.save.addEventListener("click", () => {
  const content = els.output.value.trim();
  if (!content) { toast("Nothing to save"); return; }
  const name = prompt("Preset name?", "Copy Super Prompt");
  if (name === null) return;
  savePreset(name || "Untitled", content);
  toast("Preset saved");
});

/* Load preset */
els.presets.addEventListener("change", (e) => {
  const idx = e.target.value;
  if (idx === "") return;
  const raw = localStorage.getItem(STORAGE_KEY);
  const list = raw ? JSON.parse(raw) : [];
  const item = list[Number(idx)];
  if (item) {
    els.output.value = item.content;
    toast("Preset loaded");
  }
  els.presets.value = "";
});

/* Share link (URL encode current output) */
els.share.addEventListener("click", async () => {
  const content = els.output.value.trim();
  if (!content) { toast("Nothing to share"); return; }
  const url = new URL(location.href);
  url.searchParams.set("p", encodeURIComponent(content));
  const shareUrl = url.toString();
  try {
    await navigator.clipboard.writeText(shareUrl);
    toast("Share link copied");
  } catch {
    prompt("Copy this link:", shareUrl);
  }
});

/* Hydrate from share link */
(function hydrateFromURL() {
  const p = new URLSearchParams(location.search).get("p");
  if (!p) return;
  try {
    const decoded = decodeURIComponent(p);
    els.output.value = decoded;
    toast("Loaded shared prompt");
  } catch {}
})();

