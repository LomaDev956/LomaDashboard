'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

const SERVICES = [
  {
    title: 'Tiendas online y e‑commerce',
    desc: 'Catálogo, carrito, pagos y envíos integrados para tu negocio.',
  },
  {
    title: 'Apps y plataformas web',
    desc: 'Aplicaciones modernas con Next.js, APIs y dashboards en tiempo real.',
  },
  {
    title: 'Sistemas empresariales',
    desc: 'Inventarios, garantías, tracking y flujos de trabajo a tu medida.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <header className="border-b border-slate-800/60">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-semibold text-lg tracking-tight">LomaDev</span>
          <nav className="hidden md:flex gap-6 text-sm text-slate-300">
            <a href="#servicios" className="hover:text-cyan-400 transition-colors">
              Servicios
            </a>
            <a href="#contacto" className="hover:text-cyan-400 transition-colors">
              Contacto
            </a>
          </nav>
          <Link href="/login">
            <Button className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold">
              Comenzar
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 landing-grid-bg" aria-hidden />
          <div className="absolute inset-0 landing-grid-glow opacity-70" aria-hidden />

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.25),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(129,140,248,0.18),_transparent_55%)]" />

          <div className="relative max-w-5xl mx-auto px-4 py-20 md:py-28 flex flex-col items-center text-center gap-8">
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-cyan-300/80">
              Desarrollo de software a medida
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Soluciones digitales que{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                sí resuelven tu operación
              </span>
            </h1>
            <p className="text-base md:text-lg text-slate-200 max-w-2xl">
              Tiendas online, paneles administrativos y sistemas internos
              conectados a tu operación real: inventarios, garantías, tracking y más.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold">
                  Solicitar cotización
                </Button>
              </Link>
              <a href="#servicios">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-600 text-slate-200 hover:bg-slate-900 hover:border-cyan-500/60 hover:text-cyan-300"
                >
                  Ver servicios
                </Button>
              </a>
            </div>
          </div>
        </section>

        <section id="servicios" className="border-t border-slate-800/60 bg-slate-950/70">
          <div className="max-w-5xl mx-auto px-4 py-16 md:py-20">
            <h2 className="text-2xl md:text-3xl font-semibold text-center mb-4">Servicios para tu negocio</h2>
            <p className="text-slate-300 text-center mb-12 max-w-2xl mx-auto">
              Desde un MVP sencillo hasta portales empresariales completos, diseñados para uso diario,
              no solo para “verse bonitos”.
            </p>
            <div className="grid gap-6 md:grid-cols-3">
              {SERVICES.map((s) => (
                <div
                  key={s.title}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-6 text-left shadow-sm"
                >
                  <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-300">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contacto" className="border-t border-slate-800/60 bg-slate-950">
          <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 text-center flex flex-col items-center gap-4">
            <h3 className="text-xl font-semibold">¿Tienes un proyecto en mente?</h3>
            <p className="text-slate-300 max-w-xl">
              Cuéntame qué necesitas (tienda, sistema interno, integración) y te preparo una propuesta clara.
            </p>
            <Link href="/login">
              <Button className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold">
                Iniciar sesión / Contactar
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} LomaDev. Todos los derechos reservados.
      </footer>
    </div>
  )
}
