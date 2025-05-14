// summary-generator.js

/**
 * Read the DOM and assemble a data object for summarization.
 */
function extractSummaryData() {
    const form = document.getElementById('cvForm');
    const eduItems = Array.from(document.querySelectorAll('.educationItem'));
    const expItems = Array.from(document.querySelectorAll('.experienceItem'));
    const langInputs = Array.from(document.querySelectorAll('input[name="language[]"]'));
    const langLevels = Array.from(document.querySelectorAll('select[name="languageLevel[]"]'));
    const skillsText = form.skills.value.trim();

    // Map education entries
    const education = eduItems.map(item => {
        const [degree, rest] = item.querySelectorAll('.item-meta');
        return { degree: degree.textContent, details: rest.textContent };
    });

    // Map experience entries and parse dates
    const experience = expItems.map(item => {
        const metas = item.querySelectorAll('.item-meta');
        // metas[1] contains "Company | Month YYYY - Month YYYY"
        const dates = metas[1].textContent.split(' | ')[1].split(' - ');
        return {
            title: metas[0].textContent,
            companyAndLocation: metas[1].textContent.split(' | ')[0],
            start: parseMonthYear(dates[0]),
            end: parseMonthYear(dates[1])  // empty end === ongoing
        };
    });

    // Compute total years of experience
    let totalMonths = 0;
    const now = new Date();
    experience.forEach(({ start, end }) => {
        const e = end || now;
        totalMonths += (e.getFullYear() - start.getFullYear()) * 12 + (e.getMonth() - start.getMonth());
    });
    const yearsExperience = Math.floor(totalMonths / 12);

    // Languages
    const languages = langInputs.map((inp, i) => ({
        name: inp.value.trim(),
        level: langLevels[i].value
    })).filter(l => l.name);

    // Skills array (top 3)
    const skills = skillsText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 3);

    return {
        firstName: form.firstName.value.trim(),
        lastName: form.lastName.value.trim(),
        education,
        experience,
        yearsExperience,
        skills,
        languages
    };
}

/** Helper to parse “Mon YYYY” back into a Date */
function parseMonthYear(str) {
    if (!str) return null;
    const [mon, year] = str.split(' ');
    const month = new Date(`${mon} 1, ${year}`).getMonth();
    return new Date(year, month);
}

/**
 * Build a natural-language summary.
 */
function generateSummaryText(data) {
    const {
        firstName, lastName,
        education, experience, yearsExperience,
        skills, languages
    } = data;

    // Pick first degree/company if needed
    const firstDegree = education[0]?.degree;
    const firstCompany = experience[0]?.companyAndLocation;
    const topSkillList = skills.join(', ');
    const strongLang = languages
        .filter(l => /(native|fluent)/i.test(l.level))
        .map(l => l.name)
        .join(' and ');

    // Two templates:
    if (experience.length) {
        return `${firstName} ${lastName} is a results-driven professional with over ${yearsExperience} year${yearsExperience > 1 ? 's' : ''} of experience at ${firstCompany}. Skilled in ${topSkillList}${strongLang ? ` and fluent in ${strongLang}` : ''}, they excel at delivering high-impact work in fast-paced environments.`;
    } else if (education.length) {
        return `${firstName} ${lastName} is a recent graduate in ${firstDegree}, passionate about applying academic insights to real-world challenges. With foundational skills in ${topSkillList}${strongLang ? ` and fluency in ${strongLang}` : ''}, they are eager to contribute and grow within a dynamic team.`;
    } else {
        return `${firstName} ${lastName} is a motivated individual eager to leverage a diverse skill set in ${topSkillList}${strongLang ? ` and fluent in ${strongLang}` : ''}. They bring strong adaptability, quick learning, and a collaborative mindset to any role.`;
    }
}