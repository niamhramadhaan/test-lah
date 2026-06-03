import { NextRequest, NextResponse } from 'next/server'

const WEATHER_CODES: Record<number, { condition: string; icon: string; mood: 'good' | 'neutral' | 'bad' }> = {
  0: { condition: 'Clear sky', icon: '☀️', mood: 'good' },
  1: { condition: 'Mainly clear', icon: '🌤️', mood: 'good' },
  2: { condition: 'Partly cloudy', icon: '⛅', mood: 'neutral' },
  3: { condition: 'Overcast', icon: '☁️', mood: 'neutral' },
  45: { condition: 'Foggy', icon: '🌫️', mood: 'neutral' },
  48: { condition: 'Rime fog', icon: '🌫️', mood: 'neutral' },
  51: { condition: 'Light drizzle', icon: '🌦️', mood: 'neutral' },
  53: { condition: 'Moderate drizzle', icon: '🌦️', mood: 'neutral' },
  55: { condition: 'Dense drizzle', icon: '🌧️', mood: 'bad' },
  61: { condition: 'Slight rain', icon: '🌧️', mood: 'bad' },
  63: { condition: 'Moderate rain', icon: '🌧️', mood: 'bad' },
  65: { condition: 'Heavy rain', icon: '🌧️', mood: 'bad' },
  71: { condition: 'Slight snow', icon: '❄️', mood: 'bad' },
  73: { condition: 'Moderate snow', icon: '❄️', mood: 'bad' },
  75: { condition: 'Heavy snow', icon: '❄️', mood: 'bad' },
  77: { condition: 'Snow grains', icon: '❄️', mood: 'bad' },
  80: { condition: 'Slight showers', icon: '🌦️', mood: 'neutral' },
  81: { condition: 'Moderate showers', icon: '🌧️', mood: 'bad' },
  82: { condition: 'Violent showers', icon: '⛈️', mood: 'bad' },
  85: { condition: 'Slight snow showers', icon: '🌨️', mood: 'bad' },
  86: { condition: 'Heavy snow showers', icon: '🌨️', mood: 'bad' },
  95: { condition: 'Thunderstorm', icon: '⛈️', mood: 'bad' },
  96: { condition: 'Thunderstorm + hail', icon: '⛈️', mood: 'bad' },
  99: { condition: 'Thunderstorm + heavy hail', icon: '⛈️', mood: 'bad' },
}

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat') || '-6.2'
  const lon = req.nextUrl.searchParams.get('lon') || '106.8'

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    const res = await fetch(url, { next: { revalidate: 600 } })

    if (!res.ok) {
      return NextResponse.json({ error: 'Weather API failed' }, { status: 502 })
    }

    const data = await res.json()
    const cw = data.current_weather
    const weatherInfo = WEATHER_CODES[cw.weathercode] || { condition: 'Unknown', icon: '🌡️', mood: 'neutral' as const }

    return NextResponse.json({
      temperature: Math.round(cw.temperature),
      condition: weatherInfo.condition,
      icon: weatherInfo.icon,
      mood: weatherInfo.mood,
      windSpeed: cw.windspeed,
      isDay: cw.is_day === 1,
    })
  } catch {
    return NextResponse.json({
      temperature: 28,
      condition: 'Partly cloudy',
      icon: '⛅',
      mood: 'neutral',
      windSpeed: 0,
      isDay: true,
    })
  }
}
