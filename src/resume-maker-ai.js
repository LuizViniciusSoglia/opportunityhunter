(function () {
  // Execute authentication check immediately when script loads
  // before any DOM content is shown to user
  if (!checkAuthenticationEarly()) { return; } // Stop execution if authentication check fails
  // Initialize app only after authentication is confirmed
  // Add Event listeners and other initialization codes

  // ---- Constants & State ----
  const MAX_EDU = 3, MAX_EXP = 3, MAX_LANG = 4;

  // ---- Element References ----
  const resumeForm = document.getElementById('resumeForm');
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
  function bindCharLimit(field, addListener = true) {
    const max = field.getAttribute('maxlength');
    if (!max) return;
    const msg = field.parentElement.querySelector('.char-limit-msg');
    if (!msg) return;
    function checkMaxLength() {
      if (field.value.length >= max) {
        msg.textContent = `Maximum length ${max} characters reached.`;
        msg.classList.remove('hidden');
      } else {
        msg.classList.add('hidden');
      }
    }
    if (addListener) {
      field.addEventListener('input', checkMaxLength);
    } else { checkMaxLength(); } // Just check for max characters reached
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

  // ---- Modal Management ----
  function openModal(modalElement, list, maxItems) {
    if (list.childElementCount < maxItems) {
      modalElement.classList.add('modal-visible');
      // Focus first focusable element in modal for accessibility
      //const firstFocusable = modalElement.querySelector('input, textarea, button');
      //if (firstFocusable) firstFocusable.focus();
    }
  }

  function closeModal(modalElement, modalForm) {
    modalElement.classList.remove('modal-visible');
    modalForm.reset();
    // delete every char limit warning from each input/textarea
    modalElement.querySelectorAll('input[maxlength],textarea[maxlength]')
      .forEach(removeWarningCharLimit);
  }

  // ---- Modal Open/Close ----
  addEduBtn.addEventListener('click', () => openModal(modalEdu, eduList, MAX_EDU));
  addExpBtn.addEventListener('click', () => openModal(modalExp, expList, MAX_EXP));
  cancelEduBtn.addEventListener('click', () => closeModal(modalEdu, modalEduForm));
  cancelExpBtn.addEventListener('click', () => closeModal(modalExp, modalExpForm));

  // ---- Save Education Entry ----
  saveEduBtn.addEventListener('click', () => {
    if (!modalEduForm.checkValidity()) {
      modalEduForm.reportValidity();
      return;
    }
    let eduCount = eduList.childElementCount;
    if (eduCount >= MAX_EDU) {
      addEduBtn.disabled = true;
      eduError.classList.remove('hidden');
    }
    const title = escapeHtml(document.getElementById('eduTitle').value.trim());
    const loc = escapeHtml(document.getElementById('eduLocation').value.trim());
    const start = escapeHtml(document.getElementById('eduStart').value);
    const end = escapeHtml(document.getElementById('eduEnd').value);
    const desc = escapeHtml(document.getElementById('eduDesc').value.trim());

    const item = document.createElement('div');
    item.className = 'educationItem';
    item.innerHTML = `
      <button type="button" class="btn-delete">&#10006;</button>
      <button type="button" class="toggle-edit-save">✎ Edit</button>
      <div class="item-content" contenteditable="false">
        <h4 class="item-meta">${title}</h4>
        <p class="item-meta">${loc} | ${formatMonth(start)} - ${formatMonth(end)}</p>
        <p class="item-meta">${desc}</p>
      </div>`;
    item.querySelector('.btn-delete').addEventListener('click', deleteItemList);
    item.querySelector('.toggle-edit-save').addEventListener('click', toggleEditSave);
    eduList.appendChild(item);
    eduCount++;
    if (eduCount >= MAX_EDU) {
      addEduBtn.disabled = true;
      eduError.classList.remove('hidden');
    }
    closeModal(modalEdu, modalEduForm);
  });

  // ---- Save Experience Entry ----
  saveExpBtn.addEventListener('click', () => {
    if (!modalExpForm.checkValidity()) {
      modalExpForm.reportValidity();
      return;
    }
    let expCount = expList.childElementCount;
    if (expCount >= MAX_EXP) {
      addExpBtn.disabled = true;
      expError.classList.remove('hidden');
    }
    const title = escapeHtml(document.getElementById('expTitle').value.trim());
    const loc = escapeHtml(document.getElementById('expLocation').value.trim());
    const start = escapeHtml(document.getElementById('expStart').value);
    const end = escapeHtml(document.getElementById('expEnd').value);
    const desc = escapeHtml(document.getElementById('expDesc').value.trim());

    const item = document.createElement('div');
    item.className = 'experienceItem';
    item.innerHTML = `
      <button type="button" class="btn-delete">&#10006;</button>
      <button type="button" class="toggle-edit-save">✎ Edit</button>
      <div class="item-content" contenteditable="false">
        <h4 class="item-meta">${title}</h4>
        <p class="item-meta">${loc} | ${formatMonth(start)} - ${formatMonth(end)}</p>
        <p class="item-meta">${desc}</p>
      </div>`;
    item.querySelector('.btn-delete').addEventListener('click', deleteItemList);
    item.querySelector('.toggle-edit-save').addEventListener('click', toggleEditSave);
    expList.appendChild(item);
    expCount++;
    if (expCount >= MAX_EXP) {
      addExpBtn.disabled = true;
      expError.classList.remove('hidden');
    }
    closeModal(modalExp, modalExpForm);
  });

  // ---- Add Language Inline ----
  addLangBtn.addEventListener('click', () => {
    let langCount = langList.childElementCount;
    if (langCount >= MAX_LANG) { return; }
    const row = document.createElement('div');
    row.className = 'language-row';
    row.innerHTML = `
        <button type="button" class="btn-delete">&#10006;</button>
        <input type="text" name="language[]" maxlength="20" placeholder="Language">
        <div class="char-limit-msg hidden"></div>
        <select name="languageLevel[]">
          <option value="">Level</option>
          <option>Basic</option>
          <option>Intermediate</option>
          <option>Fluent</option>
          <option>Native</option>
        </select>`;
    row.querySelector('.btn-delete').addEventListener('click', deleteItemList);
    langList.appendChild(row);
    bindCharLimit(row.querySelector('input[maxlength]'));
    langCount++;
    if (langCount >= MAX_LANG) {
      addLangBtn.disabled = true;
      langError.classList.remove('hidden');
    }
  });

  // ---- Helper: Edit/save an education or experience item by clicking the button
  function toggleEditSave(e) {
    if (e.target && e.target.nodeName === "BUTTON") {
      if (e.target.classList.contains("toggle-edit-save")) {
        const item = this.closest('.experienceItem, .educationItem');
        const content = item.querySelector('.item-content');
        const isEditing = content.isContentEditable;
        if (isEditing) {
          // Save mode
          content.contentEditable = 'false';
          this.textContent = '✎ Edit';

          // Extract updated sub-elements

          //const title = content[0].innerText.trim();
          //const locale = content[1].innerText.trim();
          //const desc = content[2].innerText.trim();

          // TODO: Persist these values to your data model.
          // E.g., update hidden inputs, or rebuild the summary data object.
          // Example:
          // document.querySelector(`#hidden-${item.dataset.id}-title`).value = title;
          // …

          // Optionally, immediately regenerate summary:
          // generateSummary();
        } else {
          // Edit mode
          content.contentEditable = 'true';
          this.textContent = '✔ Save';
          // Move cursor to end for convenience:
          const range = document.createRange();
          range.selectNodeContents(content);
          range.collapse(false);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          content.focus();
        }
      }
    }
  }

  // ---- Helper: delete an item in a list
  function deleteItemList(e) {
    // If a delete button has been clicked on a list element, this removes its parent element (the element containing the delete button)
    if (e.target && e.target.nodeName === "BUTTON") {
      if (e.target.classList.contains("btn-delete")) {
        const parent = this.parentNode;
        const grandparent = parent.parentNode;
        let nItems = grandparent.childElementCount;
        if (nItems < 1) { return; }
        const addBtn = grandparent.parentNode.querySelector('.btn-add');
        const msgError = grandparent.parentNode.querySelector('.error-msg');
        if (addBtn) {
          if (addBtn.disabled) { addBtn.disabled = false; }
        }
        if (msgError) {
          if (!msgError.classList.contains("hidden")) { msgError.classList.add('hidden'); }
        }
        parent.remove();
      }
    }
  }

  // ---- Helper to escape HTML ----
  function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ---- Format YYYY-MM to “Mon YYYY” ----
  function formatMonth(v) {
    if (!v) return 'Present';
    const [y, m] = v.split('-');
    const d = new Date(y, m - 1);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  // ---- Generate AI Summary ----
  const generateButtonSummary = document.getElementById('generateSummaryBtn');
  const summaryOutputElement = document.getElementById('summary');
  const statusSummary = document.getElementById('generate-summary-status');
  if (generateButtonSummary && summaryOutputElement) {
    generateButtonSummary.addEventListener('click', async () => {
      try {
        statusSummary.classList.remove('hidden');
        summaryOutputElement.textContent = 'Generating summary...';
        const cvData = extractSummaryData();
        const summary = await generateSummaryText(cvData);
        statusSummary.classList.add('hidden');
        summaryOutputElement.textContent = summary;
        bindCharLimit(summaryOutputElement, false); // update character-count UI
      } catch (error) {
        console.error("Error in summary generation process:", error);
        summaryOutputElement.textContent = 'Failed to generate summary.';
      }
    });
  } else {
    console.error("Elements of Summary not found.");
  }

  // ---- Generate CV Preview ----
  generateBtn.addEventListener('click', () => {
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    let education = [...eduList.querySelectorAll('.educationItem')];
    education = education.reduce((previous, current) => {
      return previous + '<ul class="eduListItem">' + [...current.querySelectorAll('.item-meta')].map((e, i) =>
        `<li>${i === 0 ? `<strong>${escapeHtml(e.textContent)}</strong>` : escapeHtml(e.textContent)}</li>`)
        .join('') + '</ul>';
    }, "");

    let experience = [...expList.querySelectorAll('.experienceItem')];
    experience = experience.reduce((previous, current) => {
      return previous + '<ul class="expListItem">' + [...current.querySelectorAll('.item-meta')].map((e, i) =>
        `<li>${i === 0 ? `<strong>${escapeHtml(e.textContent)}</strong>` : escapeHtml(e.textContent)}</li>`)
        .join('') + '</ul>';
    }, "");

    const data = {
      firstName: escapeHtml(form.firstName.value),
      lastName: escapeHtml(form.lastName.value),
      dob: escapeHtml(form.dob.value),
      email: escapeHtml(form.email.value),
      address: escapeHtml(form.address.value),
      summary: escapeHtml(form.summary.value),
      education: education,
      experience: experience,
      languages: [...langList.querySelectorAll('input[name="language[]"]')]
        .map((inp, i) => ({
          name: escapeHtml(inp.value.trim()),
          level: escapeHtml(form.querySelectorAll('select[name="languageLevel[]"]')[i].value)
        })).filter(l => l.name),
      skills: escapeHtml(form.skills.value).split(',').map(s => s.trim()).filter(Boolean)
    };

    const html = `
    <section class="cv-container">
      <h1>${data.firstName} ${data.lastName}</h1>
      ${data.dob ? `<p><strong>Date of Birth:</strong> ${data.dob}</p>` : ``}
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Address:</strong> ${data.address}</p>
      ${data.summary ? `<h2>Summary</h2><p>${data.summary}</p>` : ``}
      ${data.education ?
        `<h2>Education</h2>
        ${data.education}` : ``
      }
      ${data.experience ?
        `<h2>Experience</h2>
        ${data.experience}` : ``
      }
      ${data.languages.length ?
        `<h2>Languages</h2>
        <ul class="langList">${data.languages.map(l => `<li>${l.name}${l.level ? ` (${l.level})` : ``}</li>`).join('')}</ul>` : ``
      }
      ${data.skills.length ?
        `<h2>Skills</h2>
        <ul class="skillsList">${data.skills.map(s => `<li>${s}</li>`).join('')}</ul>` : ``
      }
    </section>`;

    resumeForm.classList.add('hidden');
    previewDiv.innerHTML = html;
    previewDiv.classList.remove('hidden');
    actionsDiv.classList.remove('hidden');
  });

  // ---- Back to Edit ----
  editBtn.addEventListener('click', () => {
    resumeForm.classList.remove('hidden');
    previewDiv.classList.add('hidden');
    actionsDiv.classList.add('hidden');
  });


  // ---- PDF Download Setup - using jsPDF and html2canvas ----
  downloadBtn.addEventListener('click', () => {
    const pdfReady = typeof window.jspdf !== 'undefined' && typeof window.html2canvas !== 'undefined';
    if (!pdfReady) {
      alert('PDF generation library is not ready. Please try again in a moment.');
      return;
    }
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });
      const source = previewDiv.querySelector('.cv-container');
      // Retira as tags strong - evita erros de formatação
      source.innerHTML = source.innerHTML.replace(/\<strong\>/g, '').replace(/\<\/strong\>/g, '');
      const filename = `${form.firstName.value}_${form.lastName.value}_Resume.pdf`;
      doc.html(source, {
        callback: function (doc) {
          doc.save(filename);
        },
        autoPaging: 'text',
        margin: [20, 10, 20, 10],
        // A4 width in pixels at 96 DPI is approx 794px
        // Using points for jsPDF, so we aim for a canvas that matches jsPDF's expectations (jsPDF A4 width is 595.28 points)
        width: 575.28, // 595.28 - margin 10 points each side
        windowWidth: 575.28
      });
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("An error occurred while generating the PDF. Please check the console.");
    }
  });
})();