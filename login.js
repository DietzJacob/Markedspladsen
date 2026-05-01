import {
  signInEmail,
  signUpEmail,
  resetPassword,
  redirectIfAuthed,
} from "./auth.js";

const BOARD_URL = "./index.html";

await redirectIfAuthed(BOARD_URL);

const $ = (id) => document.getElementById(id);
const form = $("form-email");
const emailEl = $("email");
const passEl = $("password");
const submitBtn = $("btn-submit");
const toggleBtn = $("btn-toggle");
const resetBtn = $("btn-reset");
const msg = $("msg");

let mode = "signin";

function setMsg(text, kind) {
  msg.textContent = text;
  msg.className = "login-msg" + (kind ? " is-" + kind : "");
}

function setMode(next) {
  mode = next;
  if (mode === "signup") {
    submitBtn.textContent = "Opret konto";
    toggleBtn.textContent = "Log ind i stedet";
    passEl.setAttribute("autocomplete", "new-password");
  } else {
    submitBtn.textContent = "Log ind";
    toggleBtn.textContent = "Opret konto";
    passEl.setAttribute("autocomplete", "current-password");
  }
}

function friendly(err) {
  const code = err && err.code ? err.code : "";
  switch (code) {
    case "auth/invalid-email":            return "Email-formatet ser ikke rigtigt ud.";
    case "auth/user-not-found":           return "Ingen konto med den email. Prøv 'Opret konto'.";
    case "auth/wrong-password":           return "Forkert adgangskode.";
    case "auth/invalid-credential":       return "Email eller adgangskode er forkert.";
    case "auth/email-already-in-use":     return "Den email har allerede en konto. Prøv 'Log ind'.";
    case "auth/weak-password":            return "Adgangskoden skal være mindst 6 tegn.";
    case "auth/missing-password":         return "Skriv en adgangskode.";
    case "auth/popup-closed-by-user":     return "Du lukkede Google-vinduet før login var færdigt.";
    case "auth/cancelled-popup-request":  return "Et andet login er allerede i gang.";
    case "auth/too-many-requests":        return "For mange forsøg. Vent et minut og prøv igen.";
    case "auth/network-request-failed":   return "Mistede netforbindelsen. Tjek din internetforbindelse.";
    case "auth/unauthorized-domain":      return "Dette domæne er ikke godkendt i Firebase Console.";
    default: return (err && err.message) ? err.message : "Noget gik galt. Prøv igen.";
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg("", null);
  const email = emailEl.value.trim();
  const password = passEl.value;
  if (!email || !password) { setMsg("Udfyld begge felter.", "error"); return; }

  submitBtn.disabled = true;
  try {
    if (mode === "signup") {
      await signUpEmail(email, password);
    } else {
      await signInEmail(email, password);
    }
    window.location.replace(BOARD_URL);
  } catch (err) {
    setMsg(friendly(err), "error");
  } finally {
    submitBtn.disabled = false;
  }
});

toggleBtn.addEventListener("click", () => {
  setMsg("", null);
  setMode(mode === "signin" ? "signup" : "signin");
});

resetBtn.addEventListener("click", async () => {
  setMsg("", null);
  const email = emailEl.value.trim();
  if (!email) { setMsg("Skriv din email øverst, så sender vi et reset-link.", "error"); return; }
  try {
    await resetPassword(email);
    setMsg("Vi sendte et reset-link til " + email + ".", "info");
  } catch (err) {
    setMsg(friendly(err), "error");
  }
});

setMode("signin");
