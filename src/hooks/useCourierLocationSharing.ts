'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const UPDATE_INTERVAL_MS = 8000
const MIN_DISTANCE_M = 15

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * While enabled, watch device GPS and POST updates to /api/orders/location.
 */
export function useCourierLocationSharing(orderId: string | null, enabled: boolean) {
  const [sharing, setSharing] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastSent = useRef<{ lat: number; lng: number; at: number } | null>(null)
  const watchId = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled || !orderId) {
      if (watchId.current != null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
      setSharing(false)
      return
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported on this device.')
      return
    }

    const supabase = createClient()
    let cancelled = false

    const pushLocation = async (lat: number, lng: number) => {
      const now = Date.now()
      const prev = lastSent.current
      if (prev) {
        const moved = haversineMeters(prev, { lat, lng })
        if (moved < MIN_DISTANCE_M && now - prev.at < UPDATE_INTERVAL_MS) return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token || cancelled) return

      const res = await fetch('/api/orders/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId, lat, lng }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        if (!cancelled) setError(body.error || 'Failed to update location')
        return
      }

      lastSent.current = { lat, lng, at: now }
      if (!cancelled) {
        setLastUpdate(new Date())
        setError(null)
        setSharing(true)
      }
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        void pushLocation(pos.coords.latitude, pos.coords.longitude)
      },
      (err) => {
        if (!cancelled) {
          setSharing(false)
          setError(
            err.code === err.PERMISSION_DENIED
              ? 'Location permission denied. Enable location to share live tracking.'
              : 'Unable to read device location.'
          )
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      }
    )

    setSharing(true)

    return () => {
      cancelled = true
      if (watchId.current != null) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
    }
  }, [orderId, enabled])

  return { sharing, lastUpdate, error }
}

/** One-shot current position (for Start Delivery). */
export function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )
  })
}
