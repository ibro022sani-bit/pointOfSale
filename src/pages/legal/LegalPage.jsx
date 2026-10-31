import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { APP_NAME, LEGAL_LAST_UPDATED } from '../../config/brand'

function LegalPage({ title, intro, sections, other }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-bold text-green-700">{APP_NAME}</Link>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft size={14} /> Back
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        <p className="text-xs text-gray-400 mt-1">Last updated {LEGAL_LAST_UPDATED}</p>
        {intro && <p className="text-sm text-gray-600 mt-6 leading-relaxed">{intro}</p>}
        <div className="mt-8 space-y-7">
          {sections.map((s, i) => (
            <section key={s.heading}>
              <h2 className="text-base font-semibold text-gray-800">{i + 1}. {s.heading}</h2>
              {s.body.map((p, j) => (
                <p key={j} className="text-sm text-gray-600 leading-relaxed mt-2">{p}</p>
              ))}
            </section>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-10">
          See also: <Link to={other.to} className="text-green-600 underline">{other.label}</Link>
        </p>
      </main>
    </div>
  )
}

export default LegalPage