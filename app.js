const API_KEY = "AIzaSyAyA9WvCAsldYu3l8cp7rlrsgFvsJbDHr0"; // Replace this with your actual key

document.addEventListener('DOMContentLoaded', () => {
    const skillsInput = document.getElementById('skillsInput');
    const skillsTagsContainer = document.getElementById('skillsTagsContainer');
    const searchBtn = document.getElementById('searchBtn');
    
    const resultsSection = document.getElementById('resultsSection');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    const jobsGrid = document.getElementById('jobsGrid');
    const resultsCount = document.getElementById('resultsCount');

    // State
    let skills = [];
    


    // Skills Tags Logic
    skillsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = skillsInput.value.trim().replace(',', '');
            if (val && !skills.includes(val)) {
                addSkill(val);
                skillsInput.value = '';
            }
        }
    });

    function addSkill(skill) {
        skills.push(skill);
        renderTags();
    }

    function removeSkill(skill) {
        skills = skills.filter(s => s !== skill);
        renderTags();
    }

    function renderTags() {
        skillsTagsContainer.innerHTML = '';
        skills.forEach(skill => {
            const tag = document.createElement('div');
            tag.className = 'tag glass-panel';
            tag.innerHTML = `
                ${skill}
                <button type="button" aria-label="Remove ${skill}"><i class='bx bx-x'></i></button>
            `;
            tag.querySelector('button').addEventListener('click', () => removeSkill(skill));
            skillsTagsContainer.appendChild(tag);
        });
    }

    // Search Logic
    searchBtn.addEventListener('click', async () => {
        // Grab remaining input text if user didn't press enter
        if (skillsInput.value.trim()) {
            addSkill(skillsInput.value.trim());
            skillsInput.value = '';
        }

        if (skills.length === 0) {
            alert('Please enter at least one skill to search for jobs.');
            return;
        }

        if (!API_KEY || API_KEY === "PASTE_YOUR_FREE_GEMINI_API_KEY_HERE") {
            alert('Please edit app.js to put your Gemini API Key before deploying.');
            return;
        }

        await fetchJobs(skills, API_KEY);
    });

    async function fetchJobs(skillsList, apiKey) {
        // UI Reset
        resultsSection.style.display = 'block';
        loadingState.style.display = 'flex';
        errorState.style.display = 'none';
        jobsGrid.innerHTML = '';
        resultsCount.innerText = '0 found';
        searchBtn.disabled = true;

        const promptText = `
        Search the live web for recent, available job postings that require the following skills: ${skillsList.join(', ')}.
        Prefer job listings from major job boards like Indeed, LinkedIn, or direct company career pages.
        
        CRITICAL INSTRUCTION:
        Return the results strictly as a JSON array of objects. Do not include any conversational text or markdown formatting outside of the JSON array.
        Each object in the JSON array must have the following exact keys:
        - "title": Job title (string)
        - "company": Company name (string)
        - "location": Job location or "Remote" (string)
        - "url": URL to the job posting (string, must be a real link from the search if possible, else a generic search link)
        - "description": A short 1-2 sentence description of the role (string)
        - "salary": Estimated salary range, or "Not specified" (string)
        `;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: promptText }]
                    }],
                    tools: [{
                        googleSearch: {}
                    }],
                    generationConfig: {
                        temperature: 0.2
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'Failed to fetch from Gemini API');
            }

            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) {
                throw new Error('No valid response received from the API.');
            }

            // Extract JSON array from text (in case model wraps it in markdown)
            const match = rawText.match(/\[[\s\S]*\]/);
            if (!match) {
                console.error("Raw response:", rawText);
                throw new Error('Could not parse jobs from the response. Try again.');
            }

            const jobs = JSON.parse(match[0]);
            
            if (jobs.length === 0) {
                throw new Error('No jobs found for these skills right now.');
            }

            renderJobs(jobs);

        } catch (error) {
            console.error(error);
            errorState.style.display = 'flex';
            errorMessage.innerText = error.message;
        } finally {
            loadingState.style.display = 'none';
            searchBtn.disabled = false;
        }
    }

    function renderJobs(jobs) {
        resultsCount.innerText = `${jobs.length} jobs found`;
        
        jobs.forEach(job => {
            const card = document.createElement('a');
            card.href = job.url;
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            card.className = 'job-card glass-panel';
            
            card.innerHTML = `
                <div class="job-header">
                    <h3>${job.title}</h3>
                    <div class="job-company">
                        <i class='bx bx-building'></i>
                        <span>${job.company}</span>
                    </div>
                </div>
                <div class="job-meta">
                    <span><i class='bx bx-map'></i> ${job.location}</span>
                    <span><i class='bx bx-money'></i> ${job.salary || 'Not specified'}</span>
                </div>
                <p class="job-desc">${job.description}</p>
                <div class="job-footer">
                    <span class="job-link">View Job <i class='bx bx-right-arrow-alt'></i></span>
                </div>
            `;
            
            jobsGrid.appendChild(card);
        });
    }
});
