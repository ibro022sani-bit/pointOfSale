import { useEffect, useState } from 'react'

/**
 * Wraps the browser's native `beforeinstallprompt` event so any component
 * can offer an "Install App" button — the same install your PWA already
 * supports via vite-plugin-pwa, just exposed as a button instead of relying
 * on the browser's own address-bar icon.
 *
 * Only fires on browsers that support PWA installation (Chrome/Edge/
 * Android — Safari/iOS has no equivalent event) and never fires again once
 * the app is already installed.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(
    () =>
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
  )

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setDeferredPrompt(null)
  }

  return {
    canInstall: !!deferredPrompt && !isInstalled,
    isInstalled,
    promptInstall,
  }
}
