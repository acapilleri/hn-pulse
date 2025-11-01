/**
 * Hacker News API interactions
 */

const constants = require('./constants')

// node-fetch v3 is ESM → use dynamic import
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))

// Retry helper in case of transient network errors
async function safeFetch(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise(r => setTimeout(r, 2000 * (i + 1)))
    }
  }
}

async function fetchTopStories(maxCount) {
  try {
    const ids = await safeFetch(constants.HN_API.TOP_STORIES)
    const topStoriesIds = ids.slice(0, maxCount)

    // Fetch all top stories
    const stories = []
    for (const id of topStoriesIds) {
      try {
        const story = await safeFetch(constants.HN_API.ITEM(id))
        if (story && story.title) {
          stories.push(story)
        }
      } catch (err) {
        console.error(`Error fetching story ${id}:`, err)
      }
    }

    return stories
  } catch (error) {
    console.error('Error fetching top stories:', error)
    throw error
  }
}

module.exports = {
  safeFetch,
  fetchTopStories
}

