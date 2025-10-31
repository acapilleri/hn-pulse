/**
 * Configuration and data persistence
 */

const fs = require('fs')
const path = require('path')

// These will be initialized when app is ready
let SEEN_FILE = null
let CONFIG_FILE = null

function initializePaths(userDataPath) {
  SEEN_FILE = path.join(userDataPath, 'seen.json')
  CONFIG_FILE = path.join(userDataPath, 'config.json')
}

let seen = new Set()
let maxStories = 15
let searchFilters = []

function loadSeen() {
  try {
    const data = fs.readFileSync(SEEN_FILE, 'utf8')
    return new Set(JSON.parse(data))
  } catch {
    return new Set()
  }
}

function saveSeen() {
  try {
    fs.writeFileSync(SEEN_FILE, JSON.stringify([...seen]), 'utf8')
  } catch (err) {
    console.error('Error saving seen IDs:', err)
  }
}

function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8')
    const config = JSON.parse(data)
    if (config.maxStories && typeof config.maxStories === 'number') {
      maxStories = config.maxStories
    }
    if (config.searchFilters && Array.isArray(config.searchFilters)) {
      searchFilters = config.searchFilters
    }
  } catch {
    // Use default values
    maxStories = 15
    searchFilters = []
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ maxStories, searchFilters }), 'utf8')
  } catch (err) {
    console.error('Error saving config:', err)
  }
}

function matchesFilter(story) {
  if (!searchFilters || searchFilters.length === 0) return true
  
  const title = (story.title || '').toLowerCase()
  return searchFilters.some(filter => {
    const keyword = filter.toLowerCase().trim()
    return keyword && title.includes(keyword)
  })
}

// Config will be initialized when app is ready (in main.js)

function isFirstRun() {
  // Check if this is the first run by checking if seen.json exists and is empty
  const fs = require('fs')
  if (!SEEN_FILE) return false
  try {
    if (!fs.existsSync(SEEN_FILE)) return true
    const data = fs.readFileSync(SEEN_FILE, 'utf8')
    const parsed = JSON.parse(data)
    return !parsed || parsed.length === 0
  } catch {
    return true
  }
}

function initializeSeenWithStories(storyIds) {
  // On first run, mark all current stories as seen without counting them as new
  storyIds.forEach(id => seen.add(id))
  saveSeen()
}

module.exports = {
  initializePaths,
  getSeen: () => seen,
  setSeen: (newSeen) => { seen = newSeen },
  addSeen: (id) => { seen.add(id) },
  hasSeen: (id) => seen.has(id),
  saveSeen,
  loadSeen,
  isFirstRun,
  initializeSeenWithStories,
  
  getMaxStories: () => maxStories,
  setMaxStories: (value) => { maxStories = value },
  
  getSearchFilters: () => searchFilters,
  setSearchFilters: (filters) => { searchFilters = filters },
  
  loadConfig,
  saveConfig,
  matchesFilter
}

