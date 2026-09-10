/* Academic Bureaucracy Survey — form handling
   ------------------------------------------------------------------
   SET THIS to the /exec URL of your deployed Google Apps Script web
   app (see apps-script.gs and README.md). Until you do, submitting
   will show an error instead of silently losing responses.          */
const ENDPOINT = "https://script.google.com/macros/s/AKfycbxQ5V1qEIVpUVm9sL09d1jIhK3LfA2Y9nhxJpxO0cB18bI11zTSrrf8j4wbDn-eUVrc/exec";

const form = document.getElementById("abs-form");
const statusEl = document.getElementById("status");
const doneEl = document.getElementById("done");
const submitBtn = document.getElementById("submit-btn");

/* Typing a number should select that question's number option, so people
   never fill in a box and have it discarded because the radio was unset. */
form.querySelectorAll('input[type="number"]').forEach((num) => {
  const group = num.closest(".q");
  const radio = group.querySelector('input[type="radio"]');
  const select = () => { if (radio) radio.checked = true; };
  num.addEventListener("input", select);
  num.addEventListener("focus", select);
});

/* Choosing an escape option should clear any number already typed. */
form.querySelectorAll('input[type="radio"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    if (radio.value === "days" || radio.value === "count") return;
    const num = radio.closest(".q").querySelector('input[type="number"]');
    if (num) num.value = "";
  });
});

function show(message, kind) {
  statusEl.textContent = message;
  statusEl.className = "status " + kind;
  statusEl.hidden = false;
}

/* For each numeric question, record either the number or the reason
   it is missing. Blank means the respondent skipped it entirely. */
function readQuestion(name) {
  const group = form.querySelector('.q[data-name="' + name + '"]');
  const chosen = group.querySelector('input[type="radio"]:checked');
  if (!chosen) return { value: "", status: "skipped" };
  if (chosen.value === "days" || chosen.value === "count") {
    const num = group.querySelector('input[type="number"]');
    const raw = num.value.trim();
    if (raw === "") return { value: "", status: "skipped" };
    return { value: Number(raw), status: "answered" };
  }
  return { value: "", status: chosen.value };
}

const NUMERIC = [
  "grant_days",
  "reimb_days",
  "po_days",
  "vendor_forms_vendor",
  "vendor_forms_self",
  "hire_days",
];

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const institution = form.institution.value.trim();
  const email = form.email.value.trim();

  if (!institution) {
    show("Add your institution's name so the response can be counted.", "err");
    form.institution.focus();
    return;
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    show("That email address doesn't look complete. It is used once to verify your institution, then hashed.", "err");
    form.email.focus();
    return;
  }

  const payload = {
    submitted_at: new Date().toISOString(),
    institution,
    email,
    division: form.division.value,
    position: form.position.value,
    comments: form.comments.value.trim(),
  };

  let answered = 0;
  NUMERIC.forEach((name) => {
    const q = readQuestion(name);
    payload[name] = q.value;
    payload[name + "_status"] = q.status;
    if (q.status === "answered") answered++;
  });

  if (answered === 0) {
    show("Every measurement is blank. Answer at least one question before submitting.", "err");
    return;
  }

  if (ENDPOINT.startsWith("PASTE_")) {
    show("This form isn't connected to a collector yet. Set ENDPOINT in assets/survey.js.", "err");
    return;
  }

  submitBtn.disabled = true;
  show("Sending your responses.", "ok");

  try {
    /* text/plain avoids a CORS preflight, which Apps Script cannot answer. */
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("HTTP " + response.status);

    /* Apps Script answers with 200 even when the script itself failed, and a
       misconfigured deployment answers with a Google sign-in page. Check the
       body, or a lost response looks identical to a saved one. */
    const body = await response.text();
    let result;
    try {
      result = JSON.parse(body);
    } catch (parseError) {
      throw new Error(
        'Collector returned HTML, not JSON. The deployment is probably set to ' +
        '"Anyone with a Google account" instead of "Anyone".'
      );
    }
    if (!result.ok) throw new Error("Collector reported: " + result.error);

    form.hidden = true;
    statusEl.hidden = true;
    doneEl.hidden = false;
    doneEl.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error("ABS submission failed:", error);
    submitBtn.disabled = false;
    show("Your responses didn't send. Check your connection and try again — nothing was lost from the form.", "err");
  }
});
