// Background Service Worker (Manifest V3)
// Configures extension behavior and handles cross-context messages

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[JobSeekAssistant] Extension installed/updated.')

  // Open side panel when the toolbar action icon is clicked
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    try {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      console.log('[JobSeekAssistant] Side panel behavior configured: openPanelOnActionClick=true')
    } catch (error) {
      console.warn('[JobSeekAssistant] Failed to set side panel behavior:', error)
    }
  }
})
