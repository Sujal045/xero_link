'use client'

import { useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, LocateFixed, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DEFAULT_MAP_CENTER } from '@/lib/maps/constants'
import { reverseGeocode, type LatLng } from '@/lib/maps/reverseGeocode'
import { getCurrentPosition } from '@/hooks/useCourierLocationSharing'

const ShopLocationLeafletMap = dynamic(
  () => import('@/components/map/ShopLocationLeafletMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-surface-muted text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading map…
      </div>
    ),
  }
)

export type ShopLocationValue = {
  lat: number
  lng: number
  address: string
}

interface ShopLocationPickerProps {
  value: ShopLocationValue | null
  onChange: (value: ShopLocationValue | null) => void
  disabled?: boolean
}

export function ShopLocationPicker({
  value,
  onChange,
  disabled,
}: ShopLocationPickerProps) {
  const [pin, setPin] = useState<LatLng | null>(
    value ? { lat: value.lat, lng: value.lng } : null
  )
  const [address, setAddress] = useState(value?.address ?? '')
  const [geocodingBusy, setGeocodingBusy] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [panTarget, setPanTarget] = useState<LatLng | null>(null)
  const initialCenter = value
    ? { lat: value.lat, lng: value.lng }
    : DEFAULT_MAP_CENTER

  const applyPin = useCallback(
    async (next: LatLng, options?: { pan?: boolean }) => {
      setPin(next)
      setGeoError(null)
      if (options?.pan) {
        setPanTarget(next)
      }

      setGeocodingBusy(true)
      try {
        const formatted = await reverseGeocode(next)
        if (!formatted) {
          setAddress('')
          onChange(null)
          setGeoError('Could not resolve an address for this pin. Try a nearby spot.')
          return
        }
        setAddress(formatted)
        onChange({ lat: next.lat, lng: next.lng, address: formatted })
      } catch (err) {
        setAddress('')
        onChange(null)
        setGeoError(
          err instanceof Error
            ? err.message
            : 'Address lookup failed. Check your connection and try again.'
        )
      } finally {
        setGeocodingBusy(false)
      }
    },
    [onChange]
  )

  const useMyLocation = async () => {
    if (disabled) return
    setLocating(true)
    setGeoError(null)
    const coords = await getCurrentPosition()
    setLocating(false)
    if (!coords) {
      setGeoError('Could not read your location. Allow location access or tap the map.')
      return
    }
    void applyPin(coords, { pan: true })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Shop location
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tap the map or drag the pin. Address fills in automatically (OpenStreetMap).
          </p>
        </div>
        <Button
          type="button"
          variant="soft"
          size="sm"
          onClick={() => void useMyLocation()}
          disabled={disabled || locating}
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="h-4 w-4" />
          )}
          My location
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border h-64 sm:h-72">
        <ShopLocationLeafletMap
          pin={pin}
          panTarget={panTarget}
          initialCenter={initialCenter}
          disabled={disabled}
          onPick={(pos) => void applyPin(pos)}
        />
      </div>

      <div className="rounded-xl border border-border bg-surface-muted/60 px-3 py-2.5 min-h-[3.25rem]">
        {geocodingBusy ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Fetching address…
          </p>
        ) : address ? (
          <p className="flex items-start gap-2 text-sm text-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>{address}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No pin yet — tap the map to place your shop.
          </p>
        )}
      </div>

      {geoError && <p className="text-sm text-danger">{geoError}</p>}
    </div>
  )
}
