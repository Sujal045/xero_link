'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, LocateFixed, MapPin, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DEFAULT_MAP_CENTER } from '@/lib/maps/constants'
import { reverseGeocode, type LatLng } from '@/lib/maps/reverseGeocode'
import { searchAddresses } from '@/lib/maps/searchAddresses'
import { getCurrentPosition } from '@/hooks/useCourierLocationSharing'
import type { NominatimSearchResult } from '@/lib/maps/nominatim'

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

export type DeliveryLocationValue = {
  lat: number
  lng: number
  address: string
}

interface DeliveryAddressPickerProps {
  value: DeliveryLocationValue | null
  onChange: (value: DeliveryLocationValue | null) => void
  disabled?: boolean
  /** Bias search / default map center (e.g. selected shop). */
  near?: LatLng | null
}

export function DeliveryAddressPicker({
  value,
  onChange,
  disabled,
  near,
}: DeliveryAddressPickerProps) {
  const [pin, setPin] = useState<LatLng | null>(
    value ? { lat: value.lat, lng: value.lng } : null
  )
  const [address, setAddress] = useState(value?.address ?? '')
  const [geocodingBusy, setGeocodingBusy] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [panTarget, setPanTarget] = useState<LatLng | null>(null)

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<NominatimSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const initialCenter =
    value
      ? { lat: value.lat, lng: value.lng }
      : near ?? DEFAULT_MAP_CENTER

  const applyLocation = useCallback(
    (
      next: LatLng,
      nextAddress: string,
      options?: { pan?: boolean }
    ) => {
      setPin(next)
      setAddress(nextAddress)
      setGeoError(null)
      if (options?.pan) setPanTarget(next)
      onChange({ lat: next.lat, lng: next.lng, address: nextAddress })
    },
    [onChange]
  )

  const applyPin = useCallback(
    async (next: LatLng, options?: { pan?: boolean }) => {
      setPin(next)
      setGeoError(null)
      if (options?.pan) setPanTarget(next)

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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = query.trim()
    if (trimmed.length < 3) {
      setSuggestions([])
      setSearching(false)
      return
    }

    setSearching(true)
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const results = await searchAddresses(trimmed, near ?? undefined)
          setSuggestions(results)
          setShowSuggestions(true)
          setGeoError(null)
        } catch (err) {
          setSuggestions([])
          setGeoError(
            err instanceof Error ? err.message : 'Address search failed.'
          )
        } finally {
          setSearching(false)
        }
      })()
    }, 450)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, near])

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    }
  }, [])

  const useMyLocation = async () => {
    if (disabled) return
    setLocating(true)
    setGeoError(null)
    setShowSuggestions(false)
    const coords = await getCurrentPosition()
    setLocating(false)
    if (!coords) {
      setGeoError('Could not read your location. Allow location access, search, or tap the map.')
      return
    }
    void applyPin(coords, { pan: true })
  }

  const pickSuggestion = (item: NominatimSearchResult) => {
    setQuery(item.display_name)
    setSuggestions([])
    setShowSuggestions(false)
    applyLocation(
      { lat: item.lat, lng: item.lng },
      item.display_name,
      { pan: true }
    )
  }

  const onAddressEdit = (text: string) => {
    setAddress(text)
    if (!pin || !text.trim()) {
      onChange(null)
      return
    }
    onChange({ lat: pin.lat, lng: pin.lng, address: text.trim() })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Delivery location
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Search, use your location, or tap the map to drop a pin.
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

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle pointer-events-none" />
        {searching && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        <Input
          type="search"
          value={query}
          disabled={disabled}
          placeholder="Search for an address or place…"
          className="pl-10 pr-10"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true)
          }}
          onBlur={() => {
            blurTimerRef.current = setTimeout(() => setShowSuggestions(false), 150)
          }}
          autoComplete="off"
        />
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-surface shadow-panel">
            {suggestions.map((item) => (
              <li key={`${item.lat},${item.lng},${item.display_name}`}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent-soft"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickSuggestion(item)}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span className="text-foreground">{item.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border h-56 sm:h-64">
        <ShopLocationLeafletMap
          pin={pin}
          panTarget={panTarget}
          initialCenter={initialCenter}
          disabled={disabled}
          onPick={(pos) => void applyPin(pos)}
        />
      </div>

      <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
        {geocodingBusy ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Fetching address…
          </p>
        ) : (
          <textarea
            rows={3}
            disabled={disabled || !pin}
            placeholder={
              pin
                ? 'Address details (you can edit flat / landmark)…'
                : 'No pin yet — search, use My location, or tap the map.'
            }
            value={address}
            onChange={(e) => onAddressEdit(e.target.value)}
            className="w-full bg-transparent text-foreground placeholder:text-subtle text-sm resize-none focus:outline-none disabled:opacity-60"
          />
        )}
      </div>

      {geoError && <p className="text-sm text-danger">{geoError}</p>}
    </div>
  )
}
