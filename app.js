const API_KEY = "AIzaSyBBiioZan9BoH6CCzg1kEwJFwrivPI0ERE"; // Replace this with your actual key

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
            tag.className = 'px-4 py-1.5 bg-zinc-800/80 border border-white/10 rounded-full text-sm text-zinc-300 flex items-center gap-2 backdrop-blur-sm';
            tag.innerHTML = `
                ${skill}
                <button type="button" class="hover:text-red-400 transition-colors flex items-center justify-center" aria-label="Remove ${skill}"><i class='bx bx-x text-lg'></i></button>
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
            card.className = 'bg-zinc-900/50 border border-white/5 rounded-3xl p-6 flex flex-col hover:border-white/20 transition-all hover:-translate-y-1 relative group overflow-hidden';
            
            card.innerHTML = `
                <div class="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-30 transition-opacity">
                    <i class='bx bx-link-external text-4xl text-white'></i>
                </div>
                <div class="mb-4 relative z-10">
                    <h3 class="text-xl text-white font-serif mb-2 leading-tight">${job.title}</h3>
                    <div class="text-purple-400 text-sm font-medium flex items-center gap-2 mb-2">
                        <i class='bx bx-building'></i>
                        <span>${job.company}</span>
                    </div>
                </div>
                <div class="flex flex-wrap gap-3 mb-4 text-xs text-zinc-500 relative z-10">
                    <span class="flex items-center gap-1 bg-zinc-950/50 px-2 py-1 rounded-md border border-white/5"><i class='bx bx-map'></i> ${job.location}</span>
                    <span class="flex items-center gap-1 bg-zinc-950/50 px-2 py-1 rounded-md border border-white/5"><i class='bx bx-money'></i> ${job.salary || 'Not specified'}</span>
                </div>
                <p class="text-sm text-zinc-400 flex-grow relative z-10">${job.description}</p>
                <div class="mt-6 flex justify-end relative z-10">
                    <span class="text-white text-sm font-medium flex items-center gap-1 group-hover:text-purple-300 transition-colors">Apply Now <i class='bx bx-right-arrow-alt'></i></span>
                </div>
            `;
            
            jobsGrid.appendChild(card);
        });
    }
});
