import { enableMapSet, enablePatches } from 'immer'
import { createRoot } from 'react-dom/client'
import invariant from 'tiny-invariant'
import { App } from './app.js'
import './index.scss'

if (localStorage.getItem('reset') === 'true') {
  console.log('reset')
  localStorage.clear()
}

enablePatches()
enableMapSet()

const container = document.getElementById('root')
invariant(container)

createRoot(container).render(<App />)
