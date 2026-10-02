import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GameProvider } from '@/game/GameContext'
import { FxProvider } from '@/game/FxContext'
import { TutorialModal } from '@/components/TutorialModal'
import { AppShell } from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FxProvider>
      <GameProvider>
        <AppShell />
        <TutorialModal />
      </GameProvider>
    </FxProvider>
  </StrictMode>,
)
