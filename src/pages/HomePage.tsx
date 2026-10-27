import { Ornament } from '../components/Ornament'
import { useSite } from '../useSite'

export default function HomePage() {
  const { siteTitle } = useSite()
  return (
    <main className="page page--center">
      <section className="card card--narrow fade-in">
        <Ornament />
        <h1 className="display">{siteTitle}</h1>
        <p className="muted">Brug det personlige link, du har fået tilsendt, for at se din invitation.</p>
      </section>
    </main>
  )
}
