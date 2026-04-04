import LandingPage from './landing-page'

/** Evita prerender con s-maxage=1y en `/` (confundía con “sigue igual” tras deploy). */
export const dynamic = 'force-dynamic'

export default function HomePage() {
  return <LandingPage />
}
