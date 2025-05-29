document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    initializeButtons();
});

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show selected tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    });
}

function initializeButtons() {
    const extractBtn = document.getElementById('extractBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const copyButtons = document.querySelectorAll('.copy-btn');

    extractBtn.addEventListener('click', handleExtract);
    downloadBtn.addEventListener('click', handleDownload);
    analyzeBtn.addEventListener('click', handleAnalyze);
    copyButtons.forEach(button => {
        button.addEventListener('click', () => handleCopy(button.dataset.section));
    });
}

async function handleExtract() {
    const extractBtn = document.getElementById('extractBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const resultDiv = document.getElementById('result');

    try {
        // Show loading state
        loadingDiv.style.display = 'block';
        resultDiv.style.display = 'none';
        errorDiv.style.display = 'none';
        extractBtn.disabled = true;

        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Check if we're on a YouTube video page
        if (!tab.url.includes('youtube.com/watch')) {
            throw new Error('Please navigate to a YouTube video page');
        }

        // Send message to content script
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });
        
        if (!response.success) {
            throw new Error(response.error || 'Failed to extract data');
        }

        // Display the results
        const { title, description, tags, transcript } = response.data;
        
        // Update title
        document.getElementById('titleContent').textContent = title || 'No title available';
        
        // Update description
        document.getElementById('descriptionContent').textContent = description || 'No description available';
        
        // Update tags
        const tagsContainer = document.getElementById('tagsContent');
        tagsContainer.innerHTML = '';
        if (tags && tags.length > 0) {
            tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.textContent = tag;
                tagsContainer.appendChild(tagElement);
            });
        } else {
            tagsContainer.textContent = 'No tags available';
        }
        
        // Update transcript
        document.getElementById('transcriptContent').textContent = transcript || 'No transcript available';

        // Show results and enable download button
        resultDiv.style.display = 'block';
        downloadBtn.disabled = false;
        showStatus('Data extracted successfully!', 'success');
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
        showStatus('Error: ' + error.message, 'error');
    } finally {
        loadingDiv.style.display = 'none';
        extractBtn.disabled = false;
    }
}

async function handleAnalyze() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const transcriptContent = document.getElementById('transcriptContent').textContent;
    const analysisContent = document.getElementById('analysisContent');

    if (!transcriptContent || transcriptContent === 'No transcript available') {
        showStatus('No transcript available to analyze', 'error');
        return;
    }

    try {
        analyzeBtn.disabled = true;
        showStatus('Analyzing transcript...', 'success');

        const response = await chrome.runtime.sendMessage({
            action: 'processWithGemini',
            text: transcriptContent
        });

        if (response.success) {
            analysisContent.textContent = response.result;
            // Switch to analysis tab
            document.querySelector('[data-tab="analysis"]').click();
            showStatus('Analysis completed successfully!', 'success');
        } else {
            throw new Error(response.error);
        }
    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        analyzeBtn.disabled = false;
    }
}

function handleDownload() {
    const data = {
        title: document.getElementById('titleContent').textContent,
        description: document.getElementById('descriptionContent').textContent,
        tags: Array.from(document.querySelectorAll('.tag')).map(tag => tag.textContent),
        transcript: document.getElementById('transcriptContent').textContent,
        analysis: document.getElementById('analysisContent').textContent
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'youtube-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus('Data downloaded successfully!', 'success');
}

async function handleCopy(section) {
    const content = document.getElementById(`${section}Content`).textContent;
    try {
        await navigator.clipboard.writeText(content);
        showStatus(`${section} copied to clipboard!`, 'success');
    } catch (error) {
        showStatus('Failed to copy to clipboard', 'error');
    }
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    
    // Hide status after 3 seconds
    setTimeout(() => {
        status.className = 'status';
    }, 3000);
} 