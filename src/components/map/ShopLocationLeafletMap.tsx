'use client'

import { useEffect } from 'react'
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import type { LatLng } from '@/lib/maps/reverseGeocode'
import { DEFAULT_MAP_CENTER } from '@/lib/maps/constants'
import 'leaflet/dist/leaflet.css'

const shopIcon = L.divIcon({
  className: 'xerolink-leaflet-pin',
  html: `<span class="xerolink-leaflet-pin__dot"></span>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

function MapClickHandler({
  disabled,
  onPick,
}: {
  disabled?: boolean
  onPick: (pos: LatLng) => void
}) {
  useMapEvents({
    click(e) {
      if (disabled) return
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

function MapPanHelper({ target }: { target: LatLng | null }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    map.setView([target.lat, target.lng], Math.max(map.getZoom(), 15), {
      animate: true,
    })
  }, [map, target])
  return null
}

interface ShopLocationLeafletMapProps {
  pin: LatLng | null
  panTarget: LatLng | null
  initialCenter: LatLng
  disabled?: boolean
  onPick: (pos: LatLng) => void
}

export default function ShopLocationLeafletMap({
  pin,
  panTarget,
  initialCenter,
  disabled,
  onPick,
}: ShopLocationLeafletMapProps) {
  const center = pin ?? initialCenter ?? DEFAULT_MAP_CENTER

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={15}
      className="h-full w-full z-0"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler disabled={disabled} onPick={onPick} />
      <MapPanHelper target={panTarget} />
      {pin && (
        <Marker
          position={[pin.lat, pin.lng]}
          draggable={!disabled}
          icon={shopIcon}
          eventHandlers={{
            dragend: (e) => {
              if (disabled) return
              const { lat, lng } = e.target.getLatLng()
              onPick({ lat, lng })
            },
          }}
        />
      )}
    </MapContainer>
  )
}
