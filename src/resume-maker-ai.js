(function () {
  // Execute authentication check immediately when script loads
  // before any DOM content is shown to user
  if (!checkAuthenticationEarly()) { return; } // Stop execution if authentication check fails
  // Initialize app only after authentication is confirmed
  // Add Event listeners and other initialization codes

  // ---- Constants & State ----
  const MAX_EDU = 3, MAX_EXP = 3, MAX_LANG = 4;
  let eduCount = 0, expCount = 0, langCount = 1;

  // ---- Element References ----
  const addEduBtn = document.getElementById('addEducationBtn');
  const addExpBtn = document.getElementById('addExperienceBtn');
  const addLangBtn = document.getElementById('addLanguageBtn');
  const eduList = document.getElementById('educationList');
  const expList = document.getElementById('experienceList');
  const langList = document.getElementById('languageList');
  const eduError = document.getElementById('educationError');
  const expError = document.getElementById('experienceError');
  const langError = document.getElementById('languageError');

  // Modals
  const modalEdu = document.getElementById('modalEdu');
  const modalExp = document.getElementById('modalExp');
  const cancelEduBtn = document.getElementById('cancelEduBtn');
  const saveEduBtn = document.getElementById('saveEduBtn');
  const cancelExpBtn = document.getElementById('cancelExpBtn');
  const saveExpBtn = document.getElementById('saveExpBtn');
  const modalEduForm = document.getElementById('modalEduForm');
  const modalExpForm = document.getElementById('modalExpForm');

  // Preview & PDF
  const form = document.getElementById('cvForm');
  const generateBtn = document.getElementById('generateCvBtn');
  const previewDiv = document.getElementById('resumePreview');
  const actionsDiv = document.getElementById('previewActions');
  const editBtn = document.getElementById('editBtn');
  const downloadBtn = document.getElementById('downloadPdfBtn');
  let pdfReady = false;

  // ---- Helper: bind character-limit warning ----
  function bindCharLimit(field) {
    const max = field.getAttribute('maxlength');
    if (!max) return;
    const msg = field.parentElement.querySelector('.char-limit-msg');
    if (!msg) return;
    field.addEventListener('input', () => {
      if (field.value.length >= max) {
        msg.textContent = `Maximum length ${max} characters reached.`;
        msg.classList.remove('hidden');
      } else {
        msg.classList.add('hidden');
      }
    });
  }
  // attach to every input/textarea with maxlength
  document.querySelectorAll('input[maxlength],textarea[maxlength]')
    .forEach(bindCharLimit);

  // ---- Modal Open/Close ----
  addEduBtn.addEventListener('click', () => {
    if (eduCount < MAX_EDU) modalEdu.classList.remove('hidden');
  });
  cancelEduBtn.addEventListener('click', () => {
    modalEdu.classList.add('hidden');
    modalEduForm.reset();
  });
  addExpBtn.addEventListener('click', () => {
    if (expCount < MAX_EXP) modalExp.classList.remove('hidden');
  });
  cancelExpBtn.addEventListener('click', () => {
    modalExp.classList.add('hidden');
    modalExpForm.reset();
  });

  // ---- Save Education Entry ----
  saveEduBtn.addEventListener('click', () => {
    if (!modalEduForm.checkValidity()) {
      modalEduForm.reportValidity();
      return;
    }
    const inst = document.getElementById('eduInstitution').value.trim();
    const loc = document.getElementById('eduLocation').value.trim();
    const start = document.getElementById('eduStart').value;
    const end = document.getElementById('eduEnd').value;
    const desc = document.getElementById('eduDesc').value.trim();

    const item = document.createElement('div');
    item.className = 'educationItem';
    item.innerHTML = `
        <h4>${inst}</h4>
        <span class="meta">${loc} | ${formatMonth(start)} - ${formatMonth(end)}</span>
        <p>${desc}</p>`;

    eduList.appendChild(item);
    eduCount++;
    if (eduCount >= MAX_EDU) {
      addEduBtn.disabled = true;
      eduError.classList.remove('hidden');
    }

    modalEdu.classList.add('hidden');
    modalEduForm.reset();
  });

  // ---- Save Experience Entry ----
  saveExpBtn.addEventListener('click', () => {
    if (!modalExpForm.checkValidity()) {
      modalExpForm.reportValidity();
      return;
    }
    const comp = document.getElementById('expCompany').value.trim();
    const loc = document.getElementById('expLocation').value.trim();
    const start = document.getElementById('expStart').value;
    const end = document.getElementById('expEnd').value;
    const desc = document.getElementById('expDesc').value.trim();

    const item = document.createElement('div');
    item.className = 'experienceItem';
    item.innerHTML = `
        <h4>${comp}</h4>
        <span class="meta">${loc} | ${formatMonth(start)} - ${formatMonth(end)}</span>
        <p>${desc}</p>`;

    expList.appendChild(item);
    expCount++;
    if (expCount >= MAX_EXP) {
      addExpBtn.disabled = true;
      expError.classList.remove('hidden');
    }

    modalExp.classList.add('hidden');
    modalExpForm.reset();
  });

  // ---- Add Language Inline ----
  addLangBtn.addEventListener('click', () => {
    if (langCount >= MAX_LANG) return;
    const row = document.createElement('div');
    row.className = 'language-row';
    row.innerHTML = `
        <input type="text" name="language[]" maxlength="20" placeholder="Language">
        <div class="char-limit-msg hidden"></div>
        <select name="languageLevel[]">
          <option value="">Level</option>
          <option>Basic</option>
          <option>Intermediate</option>
          <option>Fluent</option>
          <option>Native</option>
        </select>`;
    langList.appendChild(row);
    bindCharLimit(row.querySelector('input[maxlength]'));
    langCount++;
    if (langCount >= MAX_LANG) {
      addLangBtn.disabled = true;
      langError.classList.remove('hidden');
    }
  });

  // ---- Format YYYY-MM to “Mon YYYY” ----
  function formatMonth(v) {
    if (!v) return '';
    const [y, m] = v.split('-');
    const d = new Date(y, m - 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  // ---- Generate AI Summary ----
  document.getElementById('generateSummaryBtn')
    .addEventListener('click', () => {
      const firstEdu = eduList.querySelector('h4')?.textContent || '';
      const firstExp = expList.querySelector('h4')?.textContent || '';
      document.getElementById('summary').value =
        `Background in ${firstEdu} and experience at ${firstExp}.`;
    });

  // ---- Generate CV Preview ----
  generateBtn.addEventListener('click', () => {
    const data = {
      firstName: form.firstName.value,
      lastName: form.lastName.value,
      dob: form.dob.value,
      email: form.email.value,
      address: form.address.value,
      summary: form.summary.value,
      education: [...eduList.querySelectorAll('.item h4')].map(x => x.textContent),
      experience: [...expList.querySelectorAll('.item h4')].map(x => x.textContent),
      languages: [...langList.querySelectorAll('input[name="language[]"]')]
        .map((inp, i) => ({
          name: inp.value.trim(),
          level: form.querySelectorAll('select[name="languageLevel[]"]')[i].value
        })).filter(l => l.name),
      skills: form.skills.value.split(',').map(s => s.trim()).filter(Boolean)
    };

    const html = `
        <section class="cv-container">
          <h1>${data.firstName} ${data.lastName}</h1>
          <p><strong>Date of Birth:</strong> ${data.dob}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Address:</strong> ${data.address}</p>
          <h2>Summary</h2><p>${data.summary}</p>
          <h2>Education</h2>
          <ul>${data.education.map(e => `<li>${e}</li>`).join('')}</ul>
          <h2>Experience</h2>
          <ul>${data.experience.map(e => `<li>${e}</li>`).join('')}</ul>
          <h2>Languages</h2>
          <ul>${data.languages.map(l => `<li>${l.name} (${l.level})</li>`).join('')}</ul>
          <h2>Skills</h2>
          <ul>${data.skills.map(s => `<li>${s}</li>`).join('')}</ul>
        </section>`;

    document.getElementById('resumeForm').classList.add('hidden');
    previewDiv.innerHTML = html;
    previewDiv.classList.remove('hidden');
    actionsDiv.classList.remove('hidden');
  });

  // ---- Back to Edit ----
  editBtn.addEventListener('click', () => {
    document.getElementById('resumeForm').classList.remove('hidden');
    previewDiv.classList.add('hidden');
    actionsDiv.classList.add('hidden');
  });

  // ---- PDF Download Setup ----
  const pdfScript = document.createElement('script');
  pdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.3/html2pdf.bundle.min.js';
  pdfScript.crossorigin = 'anonymous';
  pdfScript.referrerpolicy = 'no-referrer';
  pdfScript.onload = () => pdfReady = true;
  document.body.appendChild(pdfScript);

  downloadBtn.addEventListener('click', () => {
    if (!pdfReady) return alert('PDF library loading, please wait.');
    html2pdf()
      .set({
        margin: 10,
        filename: `${form.firstName.value}_${form.lastName.value}_CV.pdf`
      })
      .from(previewDiv.querySelector('.cv-container'))
      .toPdf()
      .save();
  });
})();