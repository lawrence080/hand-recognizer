import { useEffect, useRef, useState } from 'react'
import '@mediapipe/control_utils/control_utils.css'

function App() {
  const [cameraError, setCameraError] = useState('')
  const [isCameraReady, setIsCameraReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  function openLandmarkDemo() {
    window.location.href = '/landmark.html'
  }

  useEffect(() => {
    let isMounted = true

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (isMounted) {
          setCameraError('Camera preview is not supported in this browser.')
        }
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }

        setIsCameraReady(true)
        setCameraError('')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setIsCameraReady(false)

        if (error instanceof DOMException) {
          setCameraError(`${error.name}: ${error.message}`)
        } else {
          setCameraError('Unable to start camera preview.')
        }
      }
    }

    startCamera()

    return () => {
      isMounted = false
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  return (
    <main className="welcome-page">
      <section className="welcome-card">
        <p className="eyebrow">Hand Landmark Extension</p>
        <h1>Welcome</h1>
        <p className="subtitle">
          Live camera preview is running below. Open the full hand-tracking page when
          you are ready.
        </p>

        <button className="camera-button" onClick={openLandmarkDemo} type="button">
          Open Hand Tracking
        </button>
      </section>

      <section className="welcome-content">
        <aside className="welcome-controls">
          <div className="control-panel">
            <div className="control-panel-entry control-panel-text">MediaPipe Hands</div>
            <div className="control-panel-entry control-panel-fps">
              <div className="fps-text">Preview</div>
              <canvas aria-hidden="true" />
            </div>
            <div className="control-panel-entry">Camera starts automatically</div>
            <div className="control-panel-entry control-panel-slider">
              <span className="label">Max Number of Hands</span>
              <span className="callout">2</span>
              <input className="value" type="range" min="1" max="4" step="1" defaultValue="2" />
            </div>
            <div className="control-panel-entry control-panel-slider">
              <span className="label">Model Complexity</span>
              <span className="callout">Full</span>
              <input className="value" type="range" min="0" max="1" step="1" defaultValue="1" />
            </div>
            <div className="control-panel-entry control-panel-slider">
              <span className="label">Min Detection Confidence</span>
              <span className="callout">0.50</span>
              <input className="value" type="range" min="0" max="1" step="0.01" defaultValue="0.5" />
            </div>
            <div className="control-panel-entry control-panel-slider">
              <span className="label">Min Tracking Confidence</span>
              <span className="callout">0.50</span>
              <input className="value" type="range" min="0" max="1" step="0.01" defaultValue="0.5" />
            </div>
          </div>
        </aside>

        <section className="camera-panel">
          <div className="camera-panel__header">
            <p className="eyebrow">Camera Feed</p>
          </div>
          <div className="video-shell">
            {!isCameraReady ? (
              <p className="video-placeholder">
                {cameraError || 'Waiting for camera permission...'}
              </p>
            ) : null}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`camera-preview ${isCameraReady ? 'is-visible' : ''}`}
            />
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
