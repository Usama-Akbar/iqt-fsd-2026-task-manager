import { useEffect, useState } from 'react'
import { api } from './api'

export default function WeatherWidget() {
  const [city, setCity] = useState('Lahore')
  const [query, setQuery] = useState('Lahore')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    api
      .weather(query)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && (setError(e.message), setData(null)))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [query])

  return (
    <section className="card weather" aria-label="Current weather">
      <form
        className="weather-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (city.trim()) setQuery(city.trim())
        }}
      >
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" aria-label="City" />
        <button type="submit" className="btn">Check</button>
      </form>
      {loading && <p className="muted">Loading weather…</p>}
      {error && !loading && <p className="error">{error}</p>}
      {data && !loading && (
        <div className="weather-body">
          <div className="weather-temp">{Math.round(data.temperature)}°C</div>
          <div>
            <strong>{data.city}, {data.country}</strong>
            <div className="muted">{data.condition} · feels {Math.round(data.feelsLike)}°C</div>
            <div className="muted">Humidity {data.humidity}% · Wind {data.windSpeed} km/h</div>
          </div>
        </div>
      )}
      <p className="source">Live data from the Open-Meteo public API</p>
    </section>
  )
}
