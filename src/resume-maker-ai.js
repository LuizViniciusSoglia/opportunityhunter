(function () {
  // Execute authentication check immediately when script loads
  // before any DOM content is shown to user
  if (!checkAuthenticationEarly()) { return; } // Stop execution if authentication check fails
  // Initialize app only after authentication is confirmed
  // Add Event listeners and other initialization codes

  // ---- Constants & State ----
  const MAX_EDU = 3, MAX_EXP = 3, MAX_LANG = 4;

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

  // ---- Helper: remove character-limit warning ----
  function removeWarningCharLimit(field) {
    const max = field.getAttribute('maxlength');
    if (!max) return;
    const msg = field.parentElement.querySelector('.char-limit-msg');
    if (!msg) return;
    msg.classList.add('hidden');
  }

  // ---- Modal Open/Close ----
  addEduBtn.addEventListener('click', () => {
    let eduCount = eduList.childElementCount;
    if (eduCount < MAX_EDU) modalEdu.classList.remove('hidden');
  });
  cancelEduBtn.addEventListener('click', () => {
    modalEdu.classList.add('hidden');
    modalEduForm.reset();
  });
  addExpBtn.addEventListener('click', () => {
    let expCount = expList.childElementCount;
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
        <button class="btn-delete">X</button>
        <h4 class="info">${inst}</h4>
        <span class="info">${loc} | ${formatMonth(start)} - ${formatMonth(end)}</span>
        <p class="info">${desc}</p>`;

    let eduCount = eduList.childElementCount;
    eduList.appendChild(item);
    eduCount++;
    if (eduCount >= MAX_EDU) {
      addEduBtn.disabled = true;
      eduError.classList.remove('hidden');
    }

    // delete every char limit warning from each input/textarea with maxlength in modalEdu
    modalEdu.querySelectorAll('input[maxlength],textarea[maxlength]')
      .forEach(removeWarningCharLimit);

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
        <button class="btn-delete">X</button>
        <h4 class="info">${comp}</h4>
        <span class="info">${loc} | ${formatMonth(start)} - ${formatMonth(end)}</span>
        <p class="info">${desc}</p>`;

    let expCount = expList.childElementCount;
    expList.appendChild(item);
    expCount++;
    if (expCount >= MAX_EXP) {
      addExpBtn.disabled = true;
      expError.classList.remove('hidden');
    }

    // delete every char limit warning from each input/textarea with maxlength in modalExp
    modalExp.querySelectorAll('input[maxlength],textarea[maxlength]')
      .forEach(removeWarningCharLimit);

    modalExp.classList.add('hidden');
    modalExpForm.reset();
  });

  // ---- Add Language Inline ----
  addLangBtn.addEventListener('click', () => {
    let langCount = langList.childElementCount;
    if (langCount >= MAX_LANG) { return; }
    const row = document.createElement('div');
    row.className = 'language-row';
    row.innerHTML = `
        <button class="btn-delete">X</button>
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

  // ---- Helper: delete an item in a list
  function deleteItemList(e) {
    // If a delete button has been clicked on a list element, this removes its parent element (the element containing the delete button)
    let nItems = this.childElementCount;
    if (nItems <= 0) { return; }
    if (e.target && e.target.nodeName === "BUTTON") {
      if (e.target.classList.contains("btn-delete")) {
        e.target.parentNode.remove();
        const parent = this.parentElement;
        const addBtn = parent.querySelector('.btn-add');
        const msgError = parent.querySelector('.error-msg');
        if (addBtn) {
          if (addBtn.disabled) { addBtn.disabled = false; }
        }
        if (msgError) {
          if (!msgError.classList.contains("hidden")) { msgError.classList.add('hidden'); }
        }
      }
    }
  }

  // ---- Delete Education Item ----
  eduList.addEventListener('click', deleteItemList);

  // ---- Delete Experience Item ----
  expList.addEventListener('click', deleteItemList);

  // ---- Delete Language Item ----
  langList.addEventListener('click', deleteItemList);

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

    let education = [...eduList.querySelectorAll('.educationItem')];
    education = education.reduce((previous, current) => {
      return previous + '<ul>' + [...current.querySelectorAll('.info')].map(e => `<li>${e.textContent}</li>`).join('') + '</ul>';
    }, "");

    let experience = [...expList.querySelectorAll('.experienceItem')];
    experience = experience.reduce((previous, current) => {
      return previous + '<ul>' + [...current.querySelectorAll('.info')].map(e => `<li>${e.textContent}</li>`).join('') + '</ul>';
    }, "");

    const data = {
      firstName: form.firstName.value,
      lastName: form.lastName.value,
      dob: form.dob.value,
      email: form.email.value,
      address: form.address.value,
      summary: form.summary.value,
      education: education,
      experience: experience,
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
          ${data.education}
          <h2>Experience</h2>
          ${data.experience}
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