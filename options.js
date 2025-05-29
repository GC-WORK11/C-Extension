document.addEventListener('DOMContentLoaded', () => {
    // Load saved API key
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) {
            document.getElementById('apiKey').value = result.geminiApiKey;
        }
    });

    // Save API key
    document.getElementById('saveBtn').addEventListener('click', () => {
        const apiKey = document.getElementById('apiKey').value.trim();
        const status = document.getElementById('status');

        if (!apiKey) {
            showStatus('Please enter an API key', 'error');
            return;
        }

        chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
            showStatus('Settings saved successfully!', 'success');
        });
    });
});

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    
    // Hide status after 3 seconds
    setTimeout(() => {
        status.className = 'status';
    }, 3000);
} 