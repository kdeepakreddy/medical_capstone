document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    const fileNameDisplay = document.getElementById('file-name');
    const fileSizeDisplay = document.getElementById('file-size');
    const removeFileBtn = document.getElementById('remove-file');
    const analyzeBtn = document.getElementById('analyze-btn');
    
    // THIS GRABS THE ICON FROM YOUR HTML
    const fileIcon = document.getElementById('file-icon'); 
    
    const heroSection = document.querySelector('.hero-section');
    const loadingState = document.getElementById('loading-state');
    const resultsSection = document.getElementById('results-section');
    const newAnalysisBtn = document.getElementById('new-analysis-btn');
    
    const overallAssessmentContainer = document.getElementById('overall-assessment-container');
    const explanationsList = document.getElementById('explanations-list');
    const termsDivider = document.getElementById('terms-divider');
    const severityText = document.getElementById('severity-text');
    const confidenceFill = document.getElementById('confidence-fill');
    const confidenceText = document.getElementById('confidence-text');

    let selectedFile = null;
    let gaugeChart = null;

    dropZone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) handleFile(files[0]);
    });

    fileInput.addEventListener('change', function() {
        if (this.files.length) handleFile(this.files[0]);
    });

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function handleFile(file) {
        selectedFile = file;
        dropZone.classList.add('hidden');
        filePreview.classList.remove('hidden');
        fileNameDisplay.textContent = file.name;
        fileSizeDisplay.textContent = formatFileSize(file.size);
        analyzeBtn.disabled = false;

        // DYNAMIC ICON LOGIC: Changes the logo based on the file uploaded
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (extension === 'pdf') {
            fileIcon.className = 'ph-fill ph-file-pdf';
            fileIcon.style.color = '#ef4444'; // Red for PDF
        } else if (['jpg', 'jpeg', 'png'].includes(extension)) {
            fileIcon.className = 'ph-fill ph-image';
            fileIcon.style.color = '#10b981'; // Green for Images
        } else if (extension === 'txt') {
            fileIcon.className = 'ph-fill ph-file-text';
            fileIcon.style.color = '#3b82f6'; // Blue for Text files
        } else {
            fileIcon.className = 'ph-fill ph-file';
            fileIcon.style.color = '#64748b'; // Gray default
        }
    }

    removeFileBtn.addEventListener('click', () => {
        selectedFile = null;
        fileInput.value = '';
        filePreview.classList.add('hidden');
        dropZone.classList.remove('hidden');
        analyzeBtn.disabled = true;
    });

    newAnalysisBtn.addEventListener('click', () => {
        resultsSection.classList.add('hidden');
        heroSection.classList.remove('hidden');
        removeFileBtn.click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    function initGaugeChart(score, level) {
        const ctx = document.getElementById('severityChart').getContext('2d');
        
        if (gaugeChart) {
            gaugeChart.destroy();
        }

        let color = '#22c55e'; // Green for Normal
        if (level === 'Low') color = '#eab308'; // Yellow
        if (level === 'Moderate') color = '#f97316'; // Orange
        if (level === 'High') color = '#ef4444'; // Red

        gaugeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [score, 100 - score], 
                    backgroundColor: [color, '#e2e8f0'],
                    borderWidth: 0,
                    circumference: 180, 
                    rotation: 270,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    tooltip: { enabled: false },
                    legend: { display: false }
                },
                animation: {
                    animateRotate: true,
                    duration: 1500
                }
            }
        });

        severityText.textContent = level;
        severityText.style.color = color;
    }

    analyzeBtn.addEventListener('click', async () => {
        if (!selectedFile) return;

        heroSection.classList.add('hidden');
        loadingState.classList.remove('hidden');
        resultsSection.classList.add('hidden');

        overallAssessmentContainer.innerHTML = '';
        explanationsList.innerHTML = '';
        termsDivider.classList.add('hidden');
        confidenceFill.style.width = '0%'; 

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await fetch('https://kdeepakreddy-medai-backend-v2.hf.space/analyze', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.status === 'success') {
                renderResults(data);
            } else {
                alert('Analysis Error: ' + data.message);
                resetToUpload();
            }
        } catch (error) {
            console.error('API Error:', error);
            alert('Failed to connect to the server. Is the FastAPI backend running?');
            resetToUpload();
        }
    });

    function resetToUpload() {
        loadingState.classList.add('hidden');
        heroSection.classList.remove('hidden');
        removeFileBtn.click();
    }

    function renderResults(data) {
        const explanations = { ...data.explanations };
        
        let severityScore = 0;
        let severityLevel = "Normal";
        let confidenceScore = 0;

        const severityScoreKey = Object.keys(explanations).find(k => k.toLowerCase().includes('severity score'));
        if (severityScoreKey) {
            severityScore = parseInt(explanations[severityScoreKey]) || 0;
            delete explanations[severityScoreKey]; 
        }

        const severityLevelKey = Object.keys(explanations).find(k => k.toLowerCase().includes('severity level'));
        if (severityLevelKey) {
            severityLevel = String(explanations[severityLevelKey]).replace(/['"]/g, '').trim();
            delete explanations[severityLevelKey];
        }

        const confidenceScoreKey = Object.keys(explanations).find(k => k.toLowerCase().includes('confidence'));
        if (confidenceScoreKey) {
            confidenceScore = parseInt(explanations[confidenceScoreKey]) || 0;
            delete explanations[confidenceScoreKey];
        }

        initGaugeChart(severityScore, severityLevel);
        
        setTimeout(() => {
            confidenceFill.style.width = confidenceScore + '%';
            confidenceText.textContent = confidenceScore + '%';
        }, 300);

        const assessmentKey = Object.keys(explanations).find(k => k.toLowerCase().includes('overall assessment') || k.toLowerCase().includes('summary'));
        
        if (assessmentKey && explanations[assessmentKey]) {
            const assessmentText = explanations[assessmentKey];
            const isError = assessmentText.toLowerCase().includes('error') || assessmentText.toLowerCase().includes('could not be generated');
            
            overallAssessmentContainer.innerHTML = `
                <div class="assessment-card" style="${isError ? 'border-color: #ef4444; background: #fef2f2;' : ''}">
                    <div class="assessment-header">
                        <div class="assessment-icon" style="${isError ? 'background: #ef4444;' : ''}">
                            <i class="${isError ? 'ph-fill ph-warning-circle' : 'ph-fill ph-stethoscope'}"></i>
                        </div>
                        <h4>${isError ? 'Analysis Error' : 'Overall Assessment'}</h4>
                    </div>
                    <div class="assessment-body">
                        ${assessmentText}
                    </div>
                </div>
            `;
            delete explanations[assessmentKey];
        }

        const remainingTerms = Object.entries(explanations).filter(([k]) => k.toLowerCase() !== 'error');

        if (remainingTerms.length > 0) {
            termsDivider.classList.remove('hidden');
            
            remainingTerms.forEach(([term, explanation]) => {
                const termCard = document.createElement('div');
                termCard.className = 'term-card';
                termCard.innerHTML = `
                    <div class="term-header">
                        <i class="ph-fill ph-book-open-text"></i>
                        <h5>${term}</h5>
                    </div>
                    <p>${explanation}</p>
                `;
                explanationsList.appendChild(termCard);
            });
        } else if (!assessmentKey) {
             explanationsList.innerHTML = `
                <div class="empty-state">
                    <i class="ph-light ph-check-circle"></i>
                    <p>No specific complex medical conditions or abnormalities were flagged in this document.</p>
                </div>
             `;
        }

        loadingState.classList.add('hidden');
        resultsSection.classList.remove('hidden');
    }
});