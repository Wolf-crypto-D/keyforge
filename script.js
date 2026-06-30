'use strict';

// ── Character sets ──
const CHARS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers:   '0123456789',
  symbols:   '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

// ── DOM refs ──
const passwordText  = document.getElementById('passwordText');
const passwordDisplay = document.getElementById('passwordDisplay');
const copyBtn       = document.getElementById('copyBtn');
const copyIcon      = document.getElementById('copyIcon');
const checkIcon     = document.getElementById('checkIcon');
const copyLabel     = document.getElementById('copyLabel');
const generateBtn   = document.getElementById('generateBtn');
const lengthSlider  = document.getElementById('lengthSlider');
const lengthValue   = document.getElementById('lengthValue');
const strengthBar   = document.getElementById('strengthBar');
const strengthText  = document.getElementById('strengthText');
const entropyText   = document.getElementById('entropyText');
const uppercaseCb   = document.getElementById('uppercase');
const lowercaseCb   = document.getElementById('lowercase');
const numbersCb     = document.getElementById('numbers');
const symbolsCb     = document.getElementById('symbols');

let currentPassword = '';
let copyTimeout = null;

// ── Cryptographically secure random ──
function secureRandom(max) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

// ── Build charset from checkboxes ──
function buildCharset() {
  let charset = '';
  if (uppercaseCb.checked) charset += CHARS.uppercase;
  if (lowercaseCb.checked) charset += CHARS.lowercase;
  if (numbersCb.checked)   charset += CHARS.numbers;
  if (symbolsCb.checked)   charset += CHARS.symbols;
  return charset;
}

// ── Generate password ──
function generatePassword(length, charset) {
  if (!charset) return '';
  let pw = '';
  // Guarantee at least one char from each selected set
  const pools = [];
  if (uppercaseCb.checked) pools.push(CHARS.uppercase);
  if (lowercaseCb.checked) pools.push(CHARS.lowercase);
  if (numbersCb.checked)   pools.push(CHARS.numbers);
  if (symbolsCb.checked)   pools.push(CHARS.symbols);

  // Fill required characters
  const required = pools.map(p => p[secureRandom(p.length)]);
  // Fill remaining
  const remaining = length - required.length;
  const rest = [];
  for (let i = 0; i < remaining; i++) {
    rest.push(charset[secureRandom(charset.length)]);
  }
  // Shuffle all together (Fisher-Yates)
  const all = [...required, ...rest];
  for (let i = all.length - 1; i > 0; i--) {
    const j = secureRandom(i + 1);
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.join('');
}

// ── Calculate entropy bits ──
function calcEntropy(length, charsetSize) {
  if (!charsetSize) return 0;
  return Math.log2(Math.pow(charsetSize, length));
}

// ── Evaluate strength ──
function evaluateStrength(entropy) {
  if (entropy < 28)  return { level: 'weak',   pct: 15,  label: 'Weak' };
  if (entropy < 50)  return { level: 'fair',   pct: 40,  label: 'Fair' };
  if (entropy < 72)  return { level: 'good',   pct: 70,  label: 'Good' };
  return              { level: 'strong', pct: 100, label: 'Strong' };
}

// ── Update strength UI ──
function updateStrength(entropy) {
  const { level, pct, label } = evaluateStrength(entropy);
  strengthBar.style.width = pct + '%';
  strengthBar.className = 'strength-bar ' + level;
  strengthText.textContent = label;
  strengthText.className = 'strength-text ' + level;
}

// ── Scramble animation ──
function scrambleAnimation(target, finalText, duration = 400) {
  const allChars = CHARS.uppercase + CHARS.lowercase + CHARS.numbers + CHARS.symbols;
  const steps = 10;
  const interval = duration / steps;
  let step = 0;

  passwordText.classList.add('animating');

  const timer = setInterval(() => {
    step++;
    const progress = step / steps;
    const revealedCount = Math.floor(progress * finalText.length);
    let display = finalText.slice(0, revealedCount);
    for (let i = revealedCount; i < finalText.length; i++) {
      display += allChars[Math.floor(Math.random() * allChars.length)];
    }
    passwordText.textContent = display;
    if (step >= steps) {
      clearInterval(timer);
      passwordText.textContent = finalText;
      passwordText.classList.remove('animating');
    }
  }, interval);
}

// ── Update slider gradient fill ──
function updateSliderFill() {
  const min = +lengthSlider.min;
  const max = +lengthSlider.max;
  const val = +lengthSlider.value;
  const pct = ((val - min) / (max - min)) * 100;
  lengthSlider.style.background = `linear-gradient(to right, #7c3aed ${pct}%, rgba(255,255,255,0.06) ${pct}%)`;
}

// ── Main generate ──
function generate() {
  const charset = buildCharset();
  const length  = +lengthSlider.value;

  if (!charset) {
    passwordText.textContent = 'Select at least one option';
    passwordText.className = 'password-text placeholder';
    passwordDisplay.classList.remove('has-password');
    strengthBar.style.width = '0%';
    strengthBar.className = 'strength-bar';
    strengthText.textContent = '—';
    strengthText.className = 'strength-text';
    entropyText.textContent = 'Select at least one character type';
    currentPassword = '';
    return;
  }

  const pw = generatePassword(length, charset);
  currentPassword = pw;

  const entropy = calcEntropy(length, charset.length);

  passwordText.className = 'password-text';
  passwordDisplay.classList.add('has-password');
  scrambleAnimation(passwordText, pw);
  updateStrength(entropy);

  // Entropy hint
  const bits = Math.round(entropy);
  const pools = [uppercaseCb, lowercaseCb, numbersCb, symbolsCb].filter(c => c.checked).length;
  entropyText.textContent = `~${bits} bits of entropy · ${pools} character type${pools !== 1 ? 's' : ''}`;

  // Reset copy state
  resetCopyBtn();
}

// ── Copy ──
async function copyPassword() {
  if (!currentPassword) return;
  try {
    await navigator.clipboard.writeText(currentPassword);
    copyIcon.classList.add('hidden');
    checkIcon.classList.remove('hidden');
    copyLabel.textContent = 'Copied!';
    copyBtn.classList.add('copied');
    if (copyTimeout) clearTimeout(copyTimeout);
    copyTimeout = setTimeout(resetCopyBtn, 2200);
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = currentPassword;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    copyLabel.textContent = 'Copied!';
  }
}

function resetCopyBtn() {
  copyIcon.classList.remove('hidden');
  checkIcon.classList.add('hidden');
  copyLabel.textContent = 'Copy';
  copyBtn.classList.remove('copied');
}

// ── Event listeners ──
generateBtn.addEventListener('click', generate);
copyBtn.addEventListener('click', copyPassword);

lengthSlider.addEventListener('input', () => {
  lengthValue.textContent = lengthSlider.value;
  updateSliderFill();
});

// At least one checkbox always stays checked
const checkboxes = [uppercaseCb, lowercaseCb, numbersCb, symbolsCb];
checkboxes.forEach(cb => {
  cb.addEventListener('change', () => {
    const anyChecked = checkboxes.some(c => c.checked);
    if (!anyChecked) cb.checked = true; // revert if last one
  });
});

// Keyboard shortcut: Enter to generate, Cmd/Ctrl+C to copy
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target !== copyBtn) generate();
  if ((e.metaKey || e.ctrlKey) && e.key === 'c' && document.activeElement !== document.body) return;
  if ((e.metaKey || e.ctrlKey) && e.key === 'g') { e.preventDefault(); generate(); }
});

// ── Init ──
updateSliderFill();
generate();
