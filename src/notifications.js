/**
 * Notification management
 */

const { Notification, shell } = require('electron')
const path = require('path')
const utils = require('./utils')
const constants = require('./constants')

function createNotification(title, body, iconPath, onClick) {
  const notification = new Notification({
    title,
    body,
    icon: iconPath || utils.getIconPath(process.platform)
  })
  
  if (onClick) {
    notification.on('click', onClick)
  }
  
  notification.show()
  return notification
}

function notifyNewStory(story, isFilterMatch = false) {
  const title = isFilterMatch 
    ? '🔍 New story matching your filters'
    : '🔥 Trending on Hacker News'
  
  const url = story.url || constants.HN_WEB.STORY(story.id)
  
  createNotification(
    title,
    story.title,
    utils.getIconPath(process.platform),
    () => shell.openExternal(url)
  )
}

function testNotification(type, searchFilters = []) {
  let title, body
  
  if (type === 'filter' && searchFilters.length > 0) {
    title = '🔍 New story matching your filters'
    body = `Test notification: A new story matching "${searchFilters.join(', ')}" has been found!`
  } else if (type === 'trending') {
    title = '🔥 Trending on Hacker News'
    body = 'Test notification: This is a trending story notification test.'
  } else {
    title = '📢 Test Notification'
    body = 'This is a test notification from HN Pulse.'
  }
  
  createNotification(
    title,
    body,
    utils.getIconPath(process.platform),
    () => shell.openExternal(constants.HN_WEB.HOMEPAGE)
  )
}

module.exports = {
  createNotification,
  notifyNewStory,
  testNotification
}

