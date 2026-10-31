import { useState } from 'react'
import { APP_NAME } from '../../config/brand'

/**
 * Drop your official logo at `public/logo.png` (so it's served from `/logo.png`).
 * Until that file exists, this quietly falls back to the green "SA" badge —
 * nothing breaks, nothing needs to change here once you add the real file.
 *
 * Used everywhere the old hardcoded "SA" badge used to be: Landing, staff
 * Login and the Admin/Cashier sidebars —
 * so the real logo will show up in all of those places automatically.
 */
function Logo({ size = 36, showText = true, textClassName = '', subtitle }) {
  const [broken, setBroken] = useState(false)
  const px = `${size}px`

  return (
    <div className="flex items-center gap-3">
      {broken ? (
        <div
          className="bg-green-600 rounded-xl flex items-center justify-center shrink-0"
          style={{ width: px, height: px }}
        >
          <span className="text-white font-bold" style={{ fontSize: size * 0.4 }}>SA</span>
        </div>
      ) : (
        <img
          src="/logo.png"
          alt={APP_NAME}
          style={{ width: px, height: px }}
          className="rounded-xl object-contain shrink-0 bg-white"
          onError={() => setBroken(true)}
        />
      )}
      {showText && (
        <div>
          <p className={`font-bold text-gray-800 leading-tight ${textClassName}`}>{APP_NAME}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      )}
    </div>
  )
}

export default Logo
