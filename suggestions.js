const { ipcRenderer } = require('electron')

const suggestionsDiv = document.getElementById('suggestions')

ipcRenderer.on('show-suggestions', (event, { suggestions }) => {
  suggestionsDiv.innerHTML = suggestions
    .map((word, index) => `
      <div class="suggestion" onclick="selectSuggestion(${index + 1})">
        ${index + 1}: ${word}
      </div>
    `).join('')
})

function selectSuggestion(number) {
  ipcRenderer.send('suggestion-selected', number)
}
