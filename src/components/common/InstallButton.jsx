import { Download } from 'lucide-react'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'

/**
 * Renders nothing until the browser is actually ready to install the app
 * (same condition that lights up the little install icon in the address
 * bar) — and nothing once it's already installed. No placeholder needed
 * here since this isn't logo-dependent; it "just works" once deployed
 * over HTTPS with the PWA manifest (already set up in vite.config.js).
 */
function InstallButton({ className = '' }) {
  const { canInstall, promptInstall } = useInstallPrompt()

  if (!canInstall) return null

  return (
    <button
      onClick={promptInstall}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-green-600 text-green-700 hover:bg-green-50 transition ${className}`}
    >
      <Download size={16} />
      Install App
    </button>
  )
}

export default InstallButton
