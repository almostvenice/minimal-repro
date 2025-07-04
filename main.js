// Modules to control application life and create native browser window
const { app, BrowserWindow, screen, ipcMain, clipboard } = require('electron')
const { GlobalKeyboardListener } = require('node-global-key-listener')

// Enable hot reloading in development
try {
  require('electron-reloader')(module, {
    debug: true,
    watchRenderer: true
  });
} catch (_) { console.log('Error loading electron-reloader'); }
const path = require('node:path')

// Global state
let suggestionWindow = null
let mainWindow = null
let currentWord = ''
let currentSentence = ''
let lastKeyTime = Date.now()
let showingAutocomplete = false

// Create global keyboard listener
const keyboard = new GlobalKeyboardListener()

// Autocomplete suggestions
const suggestions = [
  'testing',
  'testimony',
  'testament',
  'testify',
  'testicle'
]

function handleSuggestionSelection(number) {
  const index = number - 1
  if (index >= 0 && index < suggestions.length) {
    const completion = suggestions[index]
    const remainingChars = completion.slice(currentWord.length) // Get the characters to add
    
    // First backspace the current word
    for (let i = 0; i < currentWord.length; i++) {
      keyboard.sendKey({
        name: 'BACKSPACE',
        state: 'DOWN',
        type: 'KEYBOARD',
        rawKey: 'BACKSPACE'
      })
      keyboard.sendKey({
        name: 'BACKSPACE',
        state: 'UP',
        type: 'KEYBOARD',
        rawKey: 'BACKSPACE'
      })
    }
    
    // Then type out the completion
    for (const char of completion) {
      keyboard.sendKey({
        name: char.toUpperCase(),
        state: 'DOWN',
        type: 'KEYBOARD',
        rawKey: char.toUpperCase()
      })
      keyboard.sendKey({
        name: char.toUpperCase(),
        state: 'UP',
        type: 'KEYBOARD',
        rawKey: char.toUpperCase()
      })
    }
    
    // Update our internal state
    currentSentence = currentSentence.slice(0, -currentWord.length) + completion
    currentWord = completion
    showingAutocomplete = false
    suggestionWindow.hide()
    mainWindow.webContents.send('word-update', { currentWord, currentSentence })
  }
}

function createSuggestionWindow() {
  suggestionWindow = new BrowserWindow({
    width: 200,
    height: 150,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false
  })

  suggestionWindow.loadFile('suggestions.html')
}

function createWindow () {
  // Get screen dimensions
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 400,
    height: 200,
    x: width - 420, // Position near the right edge
    y: height - 220, // Position near the bottom
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    frame: false, // Remove window frame
    transparent: true, // Make window transparent
    alwaysOnTop: true, // Keep window on top
    skipTaskbar: true, // Don't show in taskbar
    movable: true // Allow window to be moved
  })

  // Load the index.html of the app
  mainWindow.loadFile('index.html')

  // Create suggestion window
  createSuggestionWindow()

  // Set up global keyboard tracking
  te
  // Listen for window movement
  ipcMain.on('move-window', (event, { deltaX, deltaY }) => {
    const pos = mainWindow.getPosition()
    mainWindow.setPosition(pos[0] + deltaX, pos[1] + deltaY)
  })

  // Listen for cursor position updates
  ipcMain.on('cursor-position', (event, position) => {
    if (suggestionWindow && showingAutocomplete) {
      // Position suggestion window near cursor
      suggestionWindow.setPosition(position.x + 20, position.y + 20)
    }
  })

  // Listen for suggestion selection
  ipcMain.on('suggestion-selected', (event, number) => {
    if (showingAutocomplete) {
      handleSuggestionSelection(parseInt(number))
    }
  })

  keyboard.addListener(function (e) {
    // Get the raw key name and state
    const rawKey = e.name
    const isPressed = e.state === 'DOWN'
    const now = Date.now()
    const delay = now - lastKeyTime
    lastKeyTime = now

    console.log(`Key: ${rawKey} ${isPressed ? 'PRESSED' : 'RELEASED'} (${delay}ms)`)
    
    if (isPressed) {
      // Handle number keys for autocomplete selection
      if (showingAutocomplete && rawKey.match(/^[1-5]$/)) {
        handleSuggestionSelection(parseInt(rawKey))
        return
      }

      // Handle backspace
      if (rawKey === 'BACKSPACE') {
        if (currentWord.length > 0) {
          currentWord = currentWord.slice(0, -1)
          currentSentence = currentSentence.slice(0, -1)
          // Check if word is still 'test' after backspace
          if (currentWord === 'test') {
            showingAutocomplete = true
            suggestionWindow.webContents.send('show-suggestions', { suggestions })
            suggestionWindow.show()
          } else {
            showingAutocomplete = false
            suggestionWindow.hide()
          }
        }
        return
      }

      // Handle space
      if (rawKey === 'SPACE') {
        showingAutocomplete = false
        mainWindow.webContents.send('word-completed')
        currentWord = ''
        currentSentence += ' '
        return
      }

      // Skip special keys and mouse buttons
      if (rawKey.startsWith('MOUSE') || 
          rawKey === 'LEFT CTRL' || 
          rawKey === 'LEFT SHIFT' || 
          rawKey === 'LEFT ALT' || 
          rawKey === 'RETURN') {
        return
      }

      // Handle regular keys
      if (rawKey.length === 1) {
        const key = rawKey.toLowerCase()
        currentWord += key
        currentSentence += key
        // Check if word is 'test' after each keystroke
        if (currentWord === 'test') {
          showingAutocomplete = true
          suggestionWindow.webContents.send('show-suggestions', { suggestions })
          suggestionWindow.show()
        }
      }
    }

    // Send update for every key press
    mainWindow.webContents.send('word-update', { currentWord, currentSentence })
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
