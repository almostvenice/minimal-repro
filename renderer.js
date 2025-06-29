/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window.
 */

const { ipcRenderer } = require('electron');

// Style the body
document.body.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
document.body.style.color = 'white';
document.body.style.fontFamily = 'Arial, sans-serif';
document.body.style.margin = '0';
document.body.style.padding = '10px';
document.body.style.borderRadius = '10px';
document.body.style.userSelect = 'none'; // Prevent text selection
document.body.style.cursor = 'move'; // Show move cursor

// Make window draggable
document.body.style.webkitAppRegion = 'drag';

// Create UI elements
const container = document.createElement('div');
container.style.padding = '10px';
document.body.appendChild(container);

const wordDisplay = document.createElement('div');
wordDisplay.style.marginBottom = '5px';
wordDisplay.innerHTML = '<strong>Current Word:</strong> <span id="current-word"></span>';
container.appendChild(wordDisplay);

const sentenceDisplay = document.createElement('div');
sentenceDisplay.style.marginBottom = '10px';
sentenceDisplay.innerHTML = '<strong>Current Sentence:</strong> <span id="current-sentence"></span>';
container.appendChild(sentenceDisplay);

const logDisplay = document.createElement('div');
logDisplay.style.fontSize = '14px';
logDisplay.style.maxHeight = '100px';
logDisplay.style.overflowY = 'auto';
logDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
logDisplay.style.padding = '5px';
logDisplay.style.borderRadius = '5px';
container.appendChild(logDisplay);

// Handle word updates
ipcRenderer.on('word-update', (event, { currentWord, currentSentence }) => {
    document.getElementById('current-word').textContent = currentWord;
    document.getElementById('current-sentence').textContent = currentSentence;
    console.log('📝', {
        'Current Word': currentWord || '(empty)',
        'Current Sentence': currentSentence || '(empty)'
    });
});

// Handle word found
ipcRenderer.on('word-found', (event, word) => {
    const timestamp = new Date().toLocaleTimeString();
    const message = `[${timestamp}] Found: "${word}"`;
    
    // Create log entry with timestamp
    const logEntry = document.createElement('div');
    logEntry.textContent = message;
    logEntry.style.color = '#4CAF50';
    logEntry.style.fontWeight = 'bold';
    logEntry.style.marginBottom = '2px';
    logDisplay.appendChild(logEntry);
    
    // Flash effect
    document.body.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
    setTimeout(() => {
        document.body.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    }, 200);
    
    // Scroll to bottom
    logDisplay.scrollTop = logDisplay.scrollHeight;
    
    // Remove old entries if there are too many
    while (logDisplay.children.length > 5) {
        logDisplay.removeChild(logDisplay.firstChild);
    }
    
    console.log('✨', message);
});

