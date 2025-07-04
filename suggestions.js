const { ipcRenderer } = require('electron')

const suggestionsDiv = document.getElementById('suggestions')

ipcRenderer.on('show-suggestions', (event, { suggestions }) => {
  const container = document.getElementById('suggestions');
  container.innerHTML = suggestions
    .map((suggestion, index) => `
      <div class="suggestion">
        <span class="number">${index + 1}</span>
        ${suggestion}
      </div>
    `)
    .join('');

  // Add click handlers
  const suggestionElements = document.querySelectorAll('.suggestion');
  suggestionElements.forEach((el, index) => {
    el.addEventListener('click', () => {
      ipcRenderer.send('suggestion-selected', { number: index + 1 });
    });
  });
})

function selectSuggestion(number) {
  ipcRenderer.send('suggestion-selected', number)
}
