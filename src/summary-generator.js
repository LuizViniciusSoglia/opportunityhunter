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
        if (start) { // Ensure start date is valid
            const e = end || now;
            totalMonths += (e.getFullYear() - start.getFullYear()) * 12 + (e.getMonth() - start.getMonth());
        }
    });
    const yearsExperience = Math.max(0, Math.floor(totalMonths / 12)); // Ensure years are not negative

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
    if (!str || str.toLowerCase() === 'present') return null; // Handle "Present" or empty strings for ongoing roles
    const [mon, year] = str.split(' ');
    // Basic validation for month and year
    if (!mon || !year || isNaN(parseInt(year))) return null;
    try {
        const monthIndex = new Date(`${mon} 1, ${year}`).getMonth();
        if (isNaN(monthIndex)) return null; // Invalid month name
        return new Date(parseInt(year), monthIndex);
    } catch (e) {
        console.error("Error parsing date:", str, e);
        return null;
    }
}

/**
 * Build a natural-language summary using AI.
 */
async function generateSummaryText(data) {
    // Retrieve the token from cookies
    const token = typeof Cookies !== 'undefined' && typeof Cookies.get === 'function' ? Cookies.get('access_token') : null;

    // Validate the token; redirect to login if invalid
    if (!isValidJWT(token)) {
        // Redirect to login page if not authenticated
        const currentUrl = encodeURIComponent(window.location.href);
        // Simulate a mouse click:
        //window.location.href = `./login.html?origin=${currentUrl}`;
        // Simulate an HTTP redirect (removes the URL from the document history, so it is not possible to use the "back" button)
        window.location.replace(`./login.html?origin=${currentUrl}`);
        return;
    }

    // URL of the API endpoint (Google Apps Script Web App)
    const APPS_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbybmA7tMSBkfeg0Fd7Xe-y-I_9CHMwkfMJ4EzevSHtEaEP3TBZ4_eHvVJ0ygvEm5t2Vpw/exec';

    let res;
    try {
        // Make the API call with the token
        res = await fetch(APPS_SCRIPT_API_URL, {
            method: 'POST',
            // No Authorization header - headers causes CORS issues with Apps Script Web App (avoiding CORS preflight)
            /*headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
            },*/
            body: JSON.stringify({
                token: token, // Pass token as URL parameter instead of header
                action: 'summarygenerator',
                data: data
            })
        });
    } catch (networkError) {
        // Handle network errors
        throw new Error('Network error occurred. Please check your connection.');
    }

    // Check if the response is not OK
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

    let status, response;
    try {
        // Parse the JSON response
        ({ status, message, response } = await res.json());
    } catch (e) {
        // Handle invalid JSON responses
        throw new Error('Invalid JSON response from API');
    }

    if (status === 200) {
        return response; // AI response
    }

    // If the AI does not respond successfully, generate a pseudo-response
    const {
        firstName, lastName,
        education, experience, yearsExperience,
        skills, languages
    } = data;

    let placeholderSummary = `${firstName} ${lastName} `;
    if (experience.length) {
        placeholderSummary += `is a results-driven professional with over ${yearsExperience} year${yearsExperience > 1 ? 's' : ''} of experience, notably at ${experience[0]?.companyAndLocation}. Skilled in ${skills.join(', ') || 'various areas'}${languages.length ? ` and proficient in ${languages.map(l => l.name).join(' and ')}` : ''}. They excel at delivering high-impact work.`;
    } else if (education.length) {
        placeholderSummary += `is a recent graduate in ${education[0]?.degree}, passionate about applying academic insights. With foundational skills in ${skills.join(', ') || 'relevant fields'}${languages.length ? ` and fluency in ${languages.map(l => l.name).join(' and ')}` : ''}, they are eager to contribute and grow.`;
    } else {
        placeholderSummary += `is a motivated individual eager to leverage a diverse skill set, including ${skills.join(', ') || 'strong adaptability'}${languages.length ? ` and proficiency in ${languages.map(l => l.name).join(' and ')}` : ''}. They bring quick learning and a collaborative mindset.`;
    }
    return placeholderSummary;
}