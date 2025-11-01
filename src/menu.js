/**
 * Menu management and UI
 */

const { Menu, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const config = require('./config')
const badge = require('./badge')
const notifications = require('./notifications')
const constants = require('./constants')

let tray = null
let topStories = []
let checkHNCallback = null

function setTray(newTray) {
  tray = newTray
}

function setTopStories(stories) {
  topStories = stories
}

function setCheckHNCallback(callback) {
  checkHNCallback = callback
}

function updateMenu() {
  if (!tray) return

  const menuItems = [
    { label: '🌐 Open Hacker News', click: () => shell.openExternal(constants.HN_WEB.HOMEPAGE) },
    { type: 'separator' }
  ]

  // Add top stories to menu (filtered by search keywords if any)
  const filteredStories = topStories.filter(config.matchesFilter)
  
  // Count new stories (not seen before) that match filters
  let newStoriesCount = 0
  const searchFilters = config.getSearchFilters()
  if (searchFilters.length > 0) {
    newStoriesCount = filteredStories.filter(story => !config.hasSeen(story.id)).length
  } else {
    // Without filters, count new trending stories
    newStoriesCount = filteredStories.filter(story => 
      !config.hasSeen(story.id) && story.score > 150 && story.descendants > 50
    ).length
  }
  
  // Update badge
  badge.updateTrayBadge(tray, newStoriesCount)
  
  const maxStories = config.getMaxStories()
  
  if (filteredStories.length > 0) {
    filteredStories.slice(0, maxStories).forEach((story, index) => {
      if (story && story.title) {
        // Truncate long titles (shorter for compact menu)
        const maxLength = 32
        const title = story.title.length > maxLength 
          ? story.title.substring(0, maxLength - 3) + '...' 
          : story.title
        
        // Get score and comments
        const score = story.score || 0
        const comments = story.descendants || 0
        
        // Visual indicators based on score
        let indicator = ''
        if (score > 300) indicator = '🔥 ' // Very hot
        else if (score > 200) indicator = '⭐ ' // Hot
        else if (score > 100) indicator = '⚡ ' // Popular
        
        // Check if story is new (not seen before)
        const isNew = !config.hasSeen(story.id)
        const newIndicator = isNew ? ' ✨' : ''
        
        // Format: create two menu items - one for title, one for points (disabled)
        const indexStr = String(index + 1).padStart(2, '0')
        const titleLabel = `${indexStr}. ${title}${indicator}${newIndicator}`
        const pointsLabel = `   ${score} points • ${comments} comments`
        
        // Title item (clickable)
        menuItems.push({
          label: titleLabel,
          toolTip: `${score} points | ${comments} comments`,
          click: () => {
            const url = story.url || constants.HN_WEB.STORY(story.id)
            shell.openExternal(url)
          }
        })
        
        // Points item (disabled, appears below title)
        menuItems.push({
          label: pointsLabel,
          enabled: false
        })
        
        // Add separator every 5 stories for better organization
        if ((index + 1) % 5 === 0 && index < maxStories - 1) {
          menuItems.push({ type: 'separator' })
        }
      }
    })
  } else {
    if (topStories.length === 0) {
      menuItems.push({ label: '⏳ Loading stories...', enabled: false })
    } else if (searchFilters.length > 0) {
      menuItems.push({ label: `🔍 No matching stories found (searched ${topStories.length}, showing filtered results)`, enabled: false })
      menuItems.push({ label: `   Filters: ${searchFilters.join(', ')}`, enabled: false })
    }
  }

  menuItems.push({ type: 'separator' })
  
  // Function to show dialog for search filters
  function showSearchFiltersDialog() {
    const currentFilters = searchFilters.join(', ')
    
    // Create a larger input window
    const inputWindow = new BrowserWindow({
      width: 600,
      height: 350,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    })
    
    inputWindow.once('ready-to-show', () => {
      inputWindow.show()
    })
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Search Filters</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            margin: 0;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #333;
          }
          input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
          }
          .hint {
            font-size: 12px;
            color: #666;
            margin-top: 8px;
            margin-bottom: 16px;
          }
          .buttons {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 16px;
          }
          button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          .btn-primary {
            background: #007AFF;
            color: white;
          }
          .btn-primary:hover {
            background: #0056CC;
          }
          .btn-secondary {
            background: #e0e0e0;
            color: #333;
          }
          .btn-secondary:hover {
            background: #d0d0d0;
          }
          .btn-danger {
            background: #ff3b30;
            color: white;
          }
          .btn-danger:hover {
            background: #d32f2f;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <label for="filters">Keywords (separate multiple words with commas):</label>
          <input type="text" id="filters" value="${currentFilters.replace(/"/g, '&quot;')}" placeholder="python, javascript, ai, machine learning">
          <div class="hint">💡 Separate multiple keywords with commas. Stories matching ANY keyword will be shown.<br>Example: "python, javascript, ai" will show stories about Python OR JavaScript OR AI.<br>Leave empty to show all stories.</div>
          <div class="buttons">
            <button class="btn-danger" onclick="clearFilters()">Clear</button>
            <button class="btn-secondary" onclick="cancel()">Cancel</button>
            <button class="btn-primary" onclick="saveFilters()">Save</button>
          </div>
        </div>
        <script>
          const { ipcRenderer } = require('electron');
          
          document.getElementById('filters').focus();
          document.getElementById('filters').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveFilters();
            if (e.key === 'Escape') cancel();
          });
          
          function saveFilters() {
            const input = document.getElementById('filters').value;
            ipcRenderer.send('save-filters', input);
            window.close();
          }
          
          function clearFilters() {
            document.getElementById('filters').value = '';
            ipcRenderer.send('save-filters', '');
            window.close();
          }
          
          function cancel() {
            window.close();
          }
        </script>
      </body>
      </html>
    `
    
    inputWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
    inputWindow.setMenuBarVisibility(false)
    inputWindow.center()
    
    // Handle IPC message from renderer
    const handler = (event, input) => {
      if (input && input.trim()) {
        const filters = input.split(',').map(f => f.trim()).filter(f => f.length > 0)
        config.setSearchFilters(filters)
      } else {
        config.setSearchFilters([])
      }
      config.saveConfig()
      updateMenu()
      if (checkHNCallback) {
        checkHNCallback()
      }
      ipcMain.removeAllListeners('save-filters')
    }
    ipcMain.once('save-filters', handler)
    
    inputWindow.on('closed', () => {
      ipcMain.removeAllListeners('save-filters')
    })
  }
  
  // Settings submenu for setting number of stories and search filters
  const filterStatus = searchFilters.length > 0 ? ` (${searchFilters.length} active)` : ''
  const configSubmenu = [
    { label: '5 stories', type: 'radio', checked: maxStories === 5, click: () => { config.setMaxStories(5); config.saveConfig(); updateMenu() } },
    { label: '10 stories', type: 'radio', checked: maxStories === 10, click: () => { config.setMaxStories(10); config.saveConfig(); updateMenu() } },
    { label: '15 stories', type: 'radio', checked: maxStories === 15, click: () => { config.setMaxStories(15); config.saveConfig(); updateMenu() } },
    { label: '20 stories', type: 'radio', checked: maxStories === 20, click: () => { config.setMaxStories(20); config.saveConfig(); updateMenu() } },
    { label: '25 stories', type: 'radio', checked: maxStories === 25, click: () => { config.setMaxStories(25); config.saveConfig(); updateMenu() } },
    { type: 'separator' },
    { label: `🔍 Search Filters${filterStatus}`, click: showSearchFiltersDialog }
  ]
  
  menuItems.push({ 
    label: '⚙️ Settings', 
    submenu: configSubmenu 
  })
  
  menuItems.push({ type: 'separator' })
  menuItems.push({ label: '⏻ Quit', click: () => require('electron').app.quit() })

  const contextMenu = Menu.buildFromTemplate(menuItems)
  tray.setContextMenu(contextMenu)
}

function showErrorMenu() {
  if (!tray) return
  
  const errorMenu = Menu.buildFromTemplate([
    { label: 'Error loading stories', enabled: false },
    { type: 'separator' },
    { label: 'Open Hacker News', click: () => shell.openExternal(constants.HN_WEB.HOMEPAGE) },
    { type: 'separator' },
    { label: '⏻ Quit', click: () => require('electron').app.quit() }
  ])
  tray.setContextMenu(errorMenu)
}

module.exports = {
  setTray,
  setTopStories,
  setCheckHNCallback,
  updateMenu,
  showErrorMenu
}

