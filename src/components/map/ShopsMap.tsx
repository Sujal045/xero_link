'use client'

import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { DEFAULT_MAP_CENTER } from '@/lib/maps/constants'
import 'leaflet/dist/leaflet.css'

export type ShopsMapShop = {
  id: string
  shop_name: string
  lat: number
  lng: number
  is_open: boolean
}

function openIcon(selected: boolean) {
  return L.divIcon({
    className: `xerolink-shop-marker ${selected ? 'is-selected' : ''} is-open`,
    html: `<span class="xerolink-shop-marker__dot"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  })
}

function closedIcon(selected: boolean) {
  return L.divIcon({
    className: `xerolink-shop-marker ${selected ? 'is-selected' : ''} is-closed`,
    html: `<span class="xerolink-shop-marker__dot"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
  })
}

function FitToShops({
  shops,
  selectedId,
}: {
  shops: ShopsMapShop[]
  selectedId: string | null
}) {
  const map = useMap()

  useEffect(() => {
    if (shops.length === 0) {
      map.setView([DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng], 13)
      return
    }

    if (selectedId) {
      const selected = shops.find((s) => s.id === selectedId)
      if (selected) {
        map.setView([selected.lat, selected.lng], Math.max(map.getZoom(), 15), {
          animate: true,
        })
        return
      }
    }

    if (shops.length === 1) {
      map.setView([shops[0].lat, shops[0].lng], 15)
      return
    }

    const bounds = L.latLngBounds(shops.map((s) => [s.lat, s.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 })
  }, [map, shops, selectedId])

  return null
}

interface ShopsMapProps {
  shops: ShopsMapShop[]
  selectedId?: string | null
  onShopClick?: (shopId: string) => void
  className?: string
}

export default function ShopsMap({
  shops,
  selectedId = null,
  onShopClick,
  className = 'h-full w-full z-0',
}: ShopsMapProps) {
  const center =
    shops.length > 0
      ? { lat: shops[0].lat, lng: shops[0].lng }
      : DEFAULT_MAP_CENTER

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      className={className}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToShops shops={shops} selectedId={selectedId} />
      {shops.map((shop) => {
        const selected = shop.id === selectedId
        return (
          <Marker
            key={shop.id}
            position={[shop.lat, shop.lng]}
            icon={shop.is_open ? openIcon(selected) : closedIcon(selected)}
            eventHandlers={{
              click: () => onShopClick?.(shop.id),
            }}
            title={shop.shop_name}
          />
        )
      })}
    </MapContainer>
  )
}
