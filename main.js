// Modules to control application life and create native browser window
const { app, BrowserWindow, screen, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const { GlobalKeyboardListener } = require('node-global-key-listener')
// File-based communication with AHK

// Enable hot reloading in development
try {
  require('electron-reloader')(module, {
    debug: true,
    watchRenderer: true
  });
} catch (_) { console.log('Error loading electron-reloader'); }

// Global state
let suggestionWindow = null
let mainWindow = null
let currentWord = ''
let currentSentence = ''
let lastKeyTime = Date.now()
let showingAutocomplete = false

// Function to send key to AHK
function sendKeyToAHK(key) {
  try {
    fs.writeFileSync('commands.txt', key);
    console.log('Successfully sent key:', key);
  } catch (err) {
    console.error('Error sending command:', err);
  }
}

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
    console.log('Selected suggestion:', { number, completion })
    
    // Send backspace command for both the word and the number key
    console.log('Backspacing current word and number:', currentWord, number)
    sendKeyToAHK(`backspace:${currentWord.length + 1}`)
    
    // Wait for backspaces to complete
    setTimeout(() => {
      // Send the completion
      console.log('Sending completion:', completion)
      sendKeyToAHK(`text:${completion}`)
    }, currentWord.length * 50 + 100)
    
    // Update our internal state
    const oldWordLength = currentWord.length + 1 // +1 for the number key
    currentWord = completion
    currentSentence = currentSentence.slice(0, -oldWordLength) + completion
    console.log('Updated state:', { currentWord, currentSentence })
    
    showingAutocomplete = false
    suggestionWindow.hide()
    mainWindow.webContents.send('word-update', { currentWord, currentSentence })
  }
}

function createSuggestionWindow() {
  const { screen } = require('electron')
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width } = primaryDisplay.workAreaSize
  
  suggestionWindow = new BrowserWindow({
    width: 200,
    height: 300,
    x: width - 220, // 20px from right edge
    y: 10, // 10px from top
    frame: false,
    show: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
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
    x: 10, // 10px from left edge
    y: 10, // 10px from top
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

  // Listen for suggestion selection
  ipcMain.on('suggestion-selected', (event, { number }) => {
    console.log('Suggestion selected:', number)
    handleSuggestionSelection(number)
  })

  // Set up global keyboard tracking
  ipcMain.on('input-update', (event, { text }) => {
    const words = text.split(/\s+/)
    currentWord = words[words.length - 1] || ''
    currentSentence = text

    console.log('Input update:', { currentWord, currentSentence })

    // Check if current word is 'test'
    if (currentWord === 'test') {
      console.log('Found test word, showing suggestions')
      showingAutocomplete = true
      suggestionWindow.webContents.send('show-suggestions', { suggestions })
      suggestionWindow.show()
    } else {
      if (showingAutocomplete) {
        console.log('Hiding suggestions')
        showingAutocomplete = false
        suggestionWindow.hide()
      }
    }
    
    mainWindow.webContents.send('word-update', { currentWord, currentSentence })
  })

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

// Start the AHK script
function startKeyHandler() {
  const { spawn } = require('child_process')
  const path = require('path')
  
  const ahkPath = path.join(__dirname, 'key_handler.ahk')
  console.log('Starting AHK script:', ahkPath)
  
  // Try common AutoHotkey v2 installation paths
  const possibleAhkPaths = [
    'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe',
    'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey32.exe',
    'C:\\Program Files\\AutoHotkey\\AutoHotkey64.exe',
    'C:\\Program Files\\AutoHotkey\\AutoHotkey32.exe'
  ]
  
  let ahkExePath = null
  for (const path of possibleAhkPaths) {
    if (require('fs').existsSync(path)) {
      ahkExePath = path
      break
    }
  }
  
  if (!ahkExePath) {
    console.error('Could not find AutoHotkey executable')
    return
  }
  
  console.log('Using AutoHotkey executable:', ahkExePath)
  const ahkProcess = spawn(ahkExePath, [ahkPath])
  
  ahkProcess.stdout.on('data', (data) => {
    console.log('AHK output:', data.toString())
  })
  
  ahkProcess.stderr.on('data', (data) => {
    console.error('AHK error:', data.toString())
  })
  
  ahkProcess.on('error', (err) => {
    console.error('Failed to start AHK script:', err)
  })
  
  ahkProcess.on('exit', (code) => {
    console.log('AHK script exited with code:', code)
  })
  
  // Kill AHK script when app exits
  app.on('before-quit', () => {
    console.log('Killing AHK script')
    ahkProcess.kill()
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  startKeyHandler()
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
