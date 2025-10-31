/**
 * Badge management for tray icon
 */

const path = require('path')
const fs = require('fs')
const sharp = require('sharp')
const { app } = require('electron')
const utils = require('./utils')

async function updateTrayBadge(tray, count) {
  if (!tray || process.platform !== 'darwin') return
  
  try {
    const iconPath = utils.getIconPath('darwin')
    if (!fs.existsSync(iconPath)) {
      console.log('Icon file not found:', iconPath)
      return
    }
    
    if (count === 0) {
      // Reset to original icon if no badge needed
      tray.setImage(iconPath)
      console.log('Badge cleared, restored original icon')
      return
    }
    
    // Read original icon
    const originalIcon = await sharp(iconPath).ensureAlpha().toBuffer()
    const metadata = await sharp(originalIcon).metadata()
    const size = metadata.width || 22
    
    console.log(`Icon size: ${size}x${size}, badge count: ${count}`)
    
    // Create badge dimensions (larger)
    const badgeSize = Math.max(10, Math.floor(size * 0.55))
    const badgeRadius = badgeSize / 2
    const badgeX = size / 2 - badgeRadius  // Position at center horizontally
    const badgeY = size / 2 - badgeRadius  // Position at middle height (vertically centered)
    
    // Create badge text
    const badgeText = count > 99 ? '99+' : String(count)
    const fontSize = count > 9 ? Math.floor(badgeSize * 0.5) : Math.floor(badgeSize * 0.65)
    
    // Create badge SVG with proper dimensions
    const badgeSvg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${badgeX + badgeRadius}" cy="${badgeY + badgeRadius}" 
                r="${badgeRadius - 0.5}" fill="#ff3b30" stroke="#ffffff" stroke-width="1"/>
        <text x="${badgeX + badgeRadius}" y="${badgeY + badgeRadius}" 
              font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
              font-size="${fontSize}" font-weight="bold" fill="white" 
              text-anchor="middle" dominant-baseline="central">${badgeText}</text>
      </svg>
    `
    
    // Render SVG to buffer
    const badgeBuffer = await sharp(Buffer.from(badgeSvg))
      .resize(size, size)
      .png()
      .toBuffer()
    
    // Composite badge onto original icon
    const finalIcon = await sharp(originalIcon)
      .composite([{ input: badgeBuffer, top: 0, left: 0, blend: 'over' }])
      .png()
      .toBuffer()
    
    // Save to temp file and load it (more reliable on macOS)
    const tempIconPath = path.join(app.getPath('temp'), `hn-pulse-badge-${count}.png`)
    await sharp(finalIcon).png().toFile(tempIconPath)
    
    // Update tray icon from file
    tray.setImage(tempIconPath)
    
    console.log(`Badge updated with count: ${count}, temp file: ${tempIconPath}`)
  } catch (error) {
    console.error('Error updating tray badge:', error)
    console.error(error.stack)
    // Fallback to original icon
    const iconPath = utils.getIconPath('darwin')
    if (fs.existsSync(iconPath)) {
      tray.setImage(iconPath)
    }
  }
}

module.exports = {
  updateTrayBadge
}

