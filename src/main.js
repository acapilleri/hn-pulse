/**
 * HN Pulse
 * Author: Angelo Capilleri
 * Email: capirellleri@gmail.com
 * © 2025
 */

const { app, Tray } = require('electron')
const path = require('path')
const fs = require('fs')
const config = require('./config')
const hnApi = require('./hn-api')
const menu = require('./menu')
const notifications = require('./notifications')
const utils = require('./utils')

let tray = null

// -----------------------------
// 📰 Hacker News checker
// -----------------------------
async function checkHN() {
  try {
    const searchFilters = config.getSearchFilters()
    const maxStories = config.getMaxStories()
    
    // If filters are active, fetch more stories to have better chance of finding matches
    const fetchCount = searchFilters.length > 0 ? Math.max(maxStories * 3, 50) : maxStories
    
    const stories = await hnApi.fetchTopStories(fetchCount)

    // Update top stories and menu
    menu.setTopStories(stories)
    menu.updateMenu()

    // Check for new stories for notifications
    for (const story of stories) {
      if (!config.hasSeen(story.id)) {
        config.addSeen(story.id)
        
        let shouldNotify = false
        let isFilterMatch = false
        
        // Check if story matches filters (if filters are active)
        if (searchFilters.length > 0 && config.matchesFilter(story)) {
          shouldNotify = true
          isFilterMatch = true
        }
        // Check if story is trending (only if no filters or if it also matches filters)
        else if (story.score > 150 && story.descendants > 50) {
          shouldNotify = true
          isFilterMatch = false
        }
        
        if (shouldNotify) {
          notifications.notifyNewStory(story, isFilterMatch)
        }
      }
    }

    config.saveSeen()
  } catch (error) {
    console.error('Error fetching Hacker News:', error)
    // Update menu with error message
    menu.showErrorMenu()
  }
}

// -----------------------------
// 🚀 App initialization
// -----------------------------
app.whenReady().then(() => {
  // Initialize config paths
  config.initializePaths(app.getPath('userData'))
  
  // Load configuration
  config.setSeen(config.loadSeen())
  config.loadConfig()

  if (process.platform === 'win32') {
    app.setAppUserModelId(app.name)
  }

  // Hide dock icon on macOS (menu bar only app)
  if (process.platform === 'darwin') {
    app.dock.hide()
  }

  // Choose icon depending on platform
  const iconPath = utils.getIconPath(process.platform)

  // Debug: log the icon path
  console.log('Icon path:', iconPath)
  console.log('Icon exists:', fs.existsSync(iconPath))
  console.log('__dirname:', __dirname)
  console.log('process.cwd():', process.cwd())

  if (!fs.existsSync(iconPath)) {
    console.error('Icon file does not exist!', iconPath)
    app.quit()
    return
  }

  try {
    tray = new Tray(iconPath)
    tray.setToolTip('HN Pulse')
    console.log('Tray created successfully with icon:', iconPath)
    
    // Set tray in menu module
    menu.setTray(tray)
    menu.setCheckHNCallback(checkHN)
  } catch (error) {
    console.error('Error creating tray:', error)
    console.error('Error stack:', error.stack)
    app.quit()
    return
  }

  // Initial menu - will be updated with stories
  menu.updateMenu()

  // Run immediately once on startup
  checkHN()

  // Check every 10 minutes
  setInterval(checkHN, 10 * 60 * 1000)
})

// Prevent full app shutdown on macOS
app.on('window-all-closed', (e) => e.preventDefault())
