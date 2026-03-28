import { useRef, useState, type ChangeEvent } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
  const [isCameraEnabled, setIsCameraEnabled] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  function stopVideoStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsCameraEnabled(false)
  }

  async function startVideoStream() {
    setCameraError('')

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera streaming is not supported in this browser.')
      setIsCameraEnabled(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }

      setIsCameraEnabled(true)
    } catch (error) {
      console.error('Error getting video stream', error)

      if (error instanceof DOMException) {
        setCameraError(`${error.name}: ${error.message}`)
      } else {
        setCameraError('Unknown camera error.')
      }

      stopVideoStream()
    }
  }

  async function handleToggleChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.checked) {
      await startVideoStream()
      return
    }

    stopVideoStream()
  }

  // useEffect(() => {
  //   return () => {
  //     stopVideoStream()
  //   }
  // }, [])

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <label className="jarvis-toggle" htmlFor="jarvis-switch">
          <span className="jarvis-toggle__text">Activate Jarvis</span>
          <span className="jarvis-toggle__control">
            <input
              id="jarvis-switch"
              className="jarvis-toggle__input"
              type="checkbox"
              checked={isCameraEnabled}
              onChange={handleToggleChange}
            />
            <span className="jarvis-toggle__track" aria-hidden="true">
              <span className="jarvis-toggle__thumb" />
            </span>
          </span>
        </label>

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            maxWidth: '420px',
            borderRadius: '24px',
            background: '#000',
            display: isCameraEnabled ? 'block' : 'none',
          }}
        />

        {cameraError ? <p>{cameraError}</p> : null}
      </section>

    </>
  )
}

export default App
