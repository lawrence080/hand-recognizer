import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { drawFingerJointKeypointsAtStream } from '../background/landmark'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

function attachHandJointOverlay() {
  const video = document.querySelector('.camera-preview') as HTMLVideoElement | null
  const container = document.querySelector('.video-shell') as HTMLElement | null

  if (!video || !container) {
    window.requestAnimationFrame(attachHandJointOverlay)
    return
  }

  drawFingerJointKeypointsAtStream({
    video,
    container,
  }).catch((error) => {
    console.error('Failed to attach finger joint overlay', error)
  })
}

window.requestAnimationFrame(attachHandJointOverlay)
