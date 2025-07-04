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
let isDragging = false;
let currentX;
let currentY;

document.body.addEventListener('mousedown', e => {
  isDragging = true;
  currentX = e.clientX;
  currentY = e.clientY;
});

document.addEventListener('mousemove', e => {
  if (!isDragging) return

  const deltaX = e.clientX - currentX
  const deltaY = e.clientY - currentY

  ipcRenderer.send('move-window', { deltaX, deltaY })

  currentX = e.clientX
  currentY = e.clientY
});

document.addEventListener('mouseup', () => {
  isDragging = false;
});

// Track cursor position
document.addEventListener('mousemove', (e) => {
  ipcRenderer.send('cursor-position', { x: e.screenX, y: e.screenY })
})

// Create UI elements
const container = document.createElement('div');
container.style.padding = '10px';
container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
container.style.color = 'white';
container.style.fontFamily = 'Arial, sans-serif';
container.style.cursor = 'move';
document.body.appendChild(container);

// Create elements for displaying current word and sentence
const wordDisplay = document.createElement('div');
wordDisplay.style.marginBottom = '5px';
wordDisplay.innerHTML = '<strong>Current Word:</strong> <span id="current-word"></span>';
container.appendChild(wordDisplay);

const sentenceDisplay = document.createElement('div');
sentenceDisplay.style.marginBottom = '10px';
sentenceDisplay.innerHTML = '<strong>Current Sentence:</strong> <span id="current-sentence"></span>';
container.appendChild(sentenceDisplay);

// Create autocomplete container
const autocompleteBox = document.createElement('div');
autocompleteBox.style.display = 'none';
autocompleteBox.style.marginTop = '5px';
autocompleteBox.style.padding = '5px';
autocompleteBox.style.backgroundColor = 'rgba(50, 50, 50, 0.9)';
autocompleteBox.style.borderRadius = '3px';
container.appendChild(autocompleteBox);

// Create log display
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

// Show autocomplete suggestions when word is found
ipcRenderer.on('word-found', (event, suggestions) => {
  console.log('🎯 Found word:', suggestions.word);
  
  // Flash effect
  container.style.backgroundColor = 'rgba(0, 255, 0, 0.3)';
  setTimeout(() => {
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  }, 200);

  // Show suggestions
  autocompleteBox.innerHTML = suggestions.completions
    .map((word, index) => `<div style='padding: 2px'>${index + 1}: ${word}</div>`)
    .join('');
  autocompleteBox.style.display = 'block';
});

// Hide suggestions when word is completed
ipcRenderer.on('word-completed', () => {
  autocompleteBox.style.display = 'none';
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

