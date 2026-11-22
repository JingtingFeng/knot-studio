import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import css from './styles.css?inline'

const style = document.createElement('style')
style.textContent = css
document.head.appendChild(style)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
