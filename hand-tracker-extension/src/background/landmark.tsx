import './landmark.css'
import '@mediapipe/control_utils/control_utils.css'

import DeviceDetector from 'device-detector-js'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

import type { LandmarkConnectionArray, Options, Results } from '@mediapipe/hands'
import type { Data } from '@mediapipe/drawing_utils'

const mpHands = window as unknown as Window & {
  Hands: typeof import('@mediapipe/hands').Hands
  HAND_CONNECTIONS: typeof import('@mediapipe/hands').HAND_CONNECTIONS
}

const drawingUtils = window as unknown as Window & {
  drawConnectors: typeof import('@mediapipe/drawing_utils').drawConnectors
  drawLandmarks: typeof import('@mediapipe/drawing_utils').drawLandmarks
  lerp: typeof import('@mediapipe/drawing_utils').lerp
}

const controls = window as unknown as Window & {
  ControlPanel: typeof import('@mediapipe/control_utils').ControlPanel
  FPS: typeof import('@mediapipe/control_utils').FPS
  Slider: typeof import('@mediapipe/control_utils').Slider
  StaticText: typeof import('@mediapipe/control_utils').StaticText
  Toggle: typeof import('@mediapipe/control_utils').Toggle
}

const controls3d = window as unknown as Window & {
  LandmarkGrid: typeof import('@mediapipe/control_utils_3d').LandmarkGrid
}

const cameraUtils = window as unknown as Window & {
  Camera: typeof import('@mediapipe/camera_utils').Camera
}

type FingerJointOverlayOptions = {
  canvas?: HTMLCanvasElement
  container: HTMLElement
  modelAssetPath?: string
  numHands?: number
  pointColor?: string
  pointRadius?: number
  video: HTMLVideoElement
  wasmRoot?: string
}

type FingerJointOverlayController = {
  stop: () => void
}

const DEFAULT_TASKS_WASM_ROOT = new URL(
  '/vendor/tasks-vision/wasm',
  window.location.origin,
).toString()
const DEFAULT_HAND_LANDMARKER_MODEL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
const HAND_SKELETON_CONNECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
]
const FINGER_JOINT_INDICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

export async function drawFingerJointKeypointsAtStream(
  options: FingerJointOverlayOptions,
): Promise<FingerJointOverlayController> {
  const overlayCanvas = options.canvas ?? document.createElement('canvas')
  const rawOverlayContext = overlayCanvas.getContext('2d')

  if (!rawOverlayContext) {
    throw new Error('Unable to create overlay canvas context.')
  }

  const overlayContext = rawOverlayContext

  if (!options.canvas) {
    overlayCanvas.className = 'joint-overlay'
    options.container.appendChild(overlayCanvas)
  }

  const vision = await FilesetResolver.forVisionTasks(
    options.wasmRoot ?? DEFAULT_TASKS_WASM_ROOT,
  )

  const handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: options.modelAssetPath ?? DEFAULT_HAND_LANDMARKER_MODEL,
    },
    runningMode: 'VIDEO',
    numHands: options.numHands ?? 2,
  })

  let frameId = 0
  let lastVideoTime = -1
  let stopped = false

  function syncCanvasSize() {
    const width = options.video.clientWidth || options.video.videoWidth
    const height = options.video.clientHeight || options.video.videoHeight

    if (!width || !height) {
      return
    }

    if (overlayCanvas.width !== width || overlayCanvas.height !== height) {
      overlayCanvas.width = width
      overlayCanvas.height = height
    }
  }

  function drawLandmarkPoints(result: Awaited<ReturnType<typeof handLandmarker.detectForVideo>>) {
    overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
    overlayContext.strokeStyle = options.pointColor ?? '#38bdf8'
    overlayContext.fillStyle = options.pointColor ?? '#38bdf8'
    overlayContext.lineWidth = 3
    overlayContext.lineCap = 'round'
    overlayContext.lineJoin = 'round'

    for (const hand of result.landmarks) {
      for (const [startIndex, endIndex] of HAND_SKELETON_CONNECTIONS) {
        const start = hand[startIndex]
        const end = hand[endIndex]

        if (!start || !end) {
          continue
        }

        overlayContext.beginPath()
        overlayContext.moveTo(start.x * overlayCanvas.width, start.y * overlayCanvas.height)
        overlayContext.lineTo(end.x * overlayCanvas.width, end.y * overlayCanvas.height)
        overlayContext.stroke()
      }

      for (const index of FINGER_JOINT_INDICES) {
        const point = hand[index]

        if (!point) {
          continue
        }

        overlayContext.beginPath()
        overlayContext.arc(
          point.x * overlayCanvas.width,
          point.y * overlayCanvas.height,
          options.pointRadius ?? 5,
          0,
          Math.PI * 2,
        )
        overlayContext.fill()
      }
    }
  }

  function render() {
    if (stopped) {
      return
    }

    syncCanvasSize()

    if (options.video.readyState >= 2 && options.video.currentTime !== lastVideoTime) {
      const result = handLandmarker.detectForVideo(options.video, performance.now())
      drawLandmarkPoints(result)
      lastVideoTime = options.video.currentTime
    }

    frameId = window.requestAnimationFrame(render)
  }

  render()

  return {
    stop() {
      stopped = true
      window.cancelAnimationFrame(frameId)
      overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
      handLandmarker.close()

      if (!options.canvas && overlayCanvas.parentElement === options.container) {
        overlayCanvas.remove()
      }
    },
  }
}

function testSupport(supportedDevices: { client?: string; os?: string }[]) {
  const deviceDetector = new DeviceDetector()
  const detectedDevice = deviceDetector.parse(navigator.userAgent)

  let isSupported = false

  for (const device of supportedDevices) {
    if (device.client !== undefined) {
      const re = new RegExp(`^${device.client}$`)
      if (!re.test(detectedDevice.client?.name ?? '')) {
        continue
      }
    }

    if (device.os !== undefined) {
      const re = new RegExp(`^${device.os}$`)
      if (!re.test(detectedDevice.os?.name ?? '')) {
        continue
      }
    }

    isSupported = true
    break
  }

  if (!isSupported) {
    alert(
      `This demo, running on ${detectedDevice.client?.name ?? 'Unknown'}/${detectedDevice.os?.name ?? 'Unknown'}, is not well supported at this time, continue at your own risk.`,
    )
  }
}

function initLegacyLandmarkDemo() {
  const videoElement = document.getElementsByClassName('input_video')[0] as HTMLVideoElement | undefined
  const canvasElement = document.getElementsByClassName('output_canvas')[0] as HTMLCanvasElement | undefined
  const controlsElement = document.getElementsByClassName('control-panel')[0] as HTMLDivElement | undefined
  const landmarkContainer = document.getElementsByClassName('landmark-grid-container')[0] as HTMLDivElement | undefined
  const spinner = document.querySelector('.loading') as HTMLDivElement | null
  const spinnerMessage = document.querySelector('.message') as HTMLDivElement | null

  if (!videoElement || !canvasElement || !controlsElement || !landmarkContainer || !spinner || !spinnerMessage) {
    return
  }

  const safeVideoElement = videoElement
  const safeCanvasElement = canvasElement
  const safeControlsElement = controlsElement
  const safeLandmarkContainer = landmarkContainer
  const safeSpinner = spinner
  const safeSpinnerMessage = spinnerMessage

  testSupport([{ client: 'Chrome' }])

  const rawCanvasCtx = safeCanvasElement.getContext('2d')

  if (!rawCanvasCtx) {
    throw new Error('Canvas 2D context is not available.')
  }

  const canvasCtx = rawCanvasCtx

  safeSpinner.ontransitionend = () => {
    safeSpinner.style.display = 'none'
  }

  const handsAssetBaseUrl = new URL('/mediapipe/hands/', window.location.origin).toString()

  const hands = new mpHands.Hands({
    locateFile: (file) => new URL(file, handsAssetBaseUrl).toString(),
  })

  const fpsControl = new controls.FPS()

  const grid = new controls3d.LandmarkGrid(safeLandmarkContainer, {
    connectionColor: 0xcccccc,
    definedColors: [
      { name: 'Left', value: 0xffa500 },
      { name: 'Right', value: 0x00ffff },
    ],
    range: 0.2,
    fitToGrid: false,
    labelSuffix: 'm',
    landmarkSize: 2,
    numCellsPerAxis: 4,
    showHidden: false,
    centered: false,
  })

  function resizeCanvas(width: number, height: number) {
    const aspect = height / width
    let nextWidth: number
    let nextHeight: number

    if (window.innerWidth > window.innerHeight) {
      nextHeight = window.innerHeight
      nextWidth = nextHeight / aspect
    } else {
      nextWidth = window.innerWidth
      nextHeight = nextWidth * aspect
    }

    safeCanvasElement.width = nextWidth
    safeCanvasElement.height = nextHeight
  }

  function onResults(results: Results) {
    document.body.classList.add('loaded')
    fpsControl.tick()

    canvasCtx.save()
    canvasCtx.clearRect(0, 0, safeCanvasElement.width, safeCanvasElement.height)
    canvasCtx.drawImage(results.image, 0, 0, safeCanvasElement.width, safeCanvasElement.height)

    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let index = 0; index < results.multiHandLandmarks.length; index += 1) {
        const classification = results.multiHandedness[index]
        const isRightHand = classification.label === 'Right'
        const landmarks = results.multiHandLandmarks[index]

        drawingUtils.drawConnectors(canvasCtx, landmarks, mpHands.HAND_CONNECTIONS, {
          color: isRightHand ? '#00FF00' : '#FF0000',
        })

        drawingUtils.drawLandmarks(canvasCtx, landmarks, {
          color: isRightHand ? '#00FF00' : '#FF0000',
          fillColor: isRightHand ? '#FF0000' : '#00FF00',
          radius: (data: Data) => drawingUtils.lerp(data.from?.z ?? 0, -0.15, 0.1, 10, 1),
        })
      }
    }

    canvasCtx.restore()

    if (results.multiHandWorldLandmarks) {
      const landmarks = results.multiHandWorldLandmarks.reduce(
        (previous, current) => [...previous, ...current],
        [] as Results['multiHandWorldLandmarks'][number],
      )

      const colors: Array<{ color: string; list: number[] }> = []
      let connections: LandmarkConnectionArray = []

      for (let index = 0; index < results.multiHandWorldLandmarks.length; index += 1) {
        const offset = index * mpHands.HAND_CONNECTIONS.length
        const offsetConnections = mpHands.HAND_CONNECTIONS.map(
          (connection) => [connection[0] + offset, connection[1] + offset] as [number, number],
        )

        connections = connections.concat(offsetConnections)

        colors.push({
          list: offsetConnections.map((_, connectionIndex) => connectionIndex + offset),
          color: results.multiHandedness[index].label,
        })
      }

      grid.updateLandmarks(landmarks, connections, colors)
    } else {
      grid.updateLandmarks([])
    }
  }

  hands.onResults(onResults)

  new controls.ControlPanel(safeControlsElement, {
    selfieMode: true,
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
    .add([
      new controls.StaticText({ title: 'MediaPipe Hands' }),
      fpsControl,
      new controls.Toggle({ title: 'Selfie Mode', field: 'selfieMode' }),
      new controls.StaticText({ title: 'Camera starts automatically' }),
      new controls.Slider({
        title: 'Max Number of Hands',
        field: 'maxNumHands',
        range: [1, 4],
        step: 1,
      }),
      new controls.Slider({
        title: 'Model Complexity',
        field: 'modelComplexity',
        discrete: ['Lite', 'Full'],
      }),
      new controls.Slider({
        title: 'Min Detection Confidence',
        field: 'minDetectionConfidence',
        range: [0, 1],
        step: 0.01,
      }),
      new controls.Slider({
        title: 'Min Tracking Confidence',
        field: 'minTrackingConfidence',
        range: [0, 1],
        step: 0.01,
      }),
    ])
    .on((options) => {
      const handOptions = options as Options
      safeVideoElement.classList.toggle('selfie', Boolean(handOptions.selfieMode))
      hands.setOptions(handOptions)
    })

  const camera = new cameraUtils.Camera(safeVideoElement, {
    onFrame: async () => {
      resizeCanvas(safeVideoElement.videoWidth || 1280, safeVideoElement.videoHeight || 720)
      await hands.send({ image: safeVideoElement })
    },
    width: 1280,
    height: 720,
    facingMode: 'user',
  })

  camera.start().catch((error) => {
    console.error('Failed to start camera', error)
    safeSpinnerMessage.textContent =
      error instanceof Error ? error.message : 'Failed to start camera.'
  })
}

initLegacyLandmarkDemo()
