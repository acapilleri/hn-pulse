/**
 * Constants for Hacker News URLs and configuration
 */

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0'
const HN_WEB_BASE = 'https://news.ycombinator.com'

module.exports = {
  // API Endpoints
  HN_API: {
    TOP_STORIES: `${HN_API_BASE}/topstories.json`,
    ITEM: (id) => `${HN_API_BASE}/item/${id}.json`
  },
  
  // Web URLs
  HN_WEB: {
    HOMEPAGE: `${HN_WEB_BASE}/`,
    STORY: (id) => `${HN_WEB_BASE}/item?id=${id}`
  }
}

