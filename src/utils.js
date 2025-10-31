/**
 * Utility functions
 */

const path = require('path')
const fs = require('fs')

function getResourcePath(relativePath) {
  // In development, resources are in the project root
  // In production, they're in the app's resources folder
  const { app } = require('electron')
  if (app && app.isPackaged) {
    // In packaged app, resources are in the app's resources folder
    return path.join(process.resourcesPath, relativePath)
  } else {
    // In development, resources are relative to src/
    return path.resolve(__dirname, '..', relativePath)
  }
}

function getIconPath(platform) {
  if (platform === 'darwin') {
    return getResourcePath('hn-pulse-icon.png')
  } else {
    return getResourcePath('icon.png')
  }
}

module.exports = {
  getResourcePath,
  getIconPath
}

