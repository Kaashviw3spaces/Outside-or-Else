import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import ExperimentalEntry from './ai/ExperimentalEntry'
import { ThemeProvider } from './theme/ThemeProvider'
import { getAppearance, getDeviceDark } from './theme/appearance'
import { resolveEnvironment } from './theme/resolveEnvironment'
import { applyTheme } from './theme/applyTheme'
import { getEnvironment } from './lib/solar'
import { getLocation } from './lib/location'

// Refine the early clock-only bootstrap with cached solar coordinates before rendering.
const appearance = getAppearance()
const environment = getEnvironment(new Date(), getLocation().coordinates)
const resolved = resolveEnvironment(appearance, getDeviceDark(), environment.phase)
applyTheme(appearance, resolved.theme, resolved.phase)

// This isolated experiment never mounts the game or writes its progression.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider><ExperimentalEntry><App /></ExperimentalEntry></ThemeProvider>
  </StrictMode>,
)
