'use client'

import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'

interface Shop {
  id: string
  shop_name: string
  lat: number
  lng: number
  is_open: boolean
}

interface ShopsMapProps {
  shops: Shop[]
  centerLat?: number
  centerLng?: number
  onShopClick?: (shopId: string) => void
}

export default function ShopsMap({ shops, centerLat = 23.2156, centerLng = 72.6369, onShopClick }: ShopsMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!

  return (
    <APIProvider apiKey={apiKey}>
      <Map
        defaultCenter={{ lat: centerLat, lng: centerLng }}
        defaultZoom={15}
        mapId="xerolink-shops-map"
        gestureHandling="greedy"
        disableDefaultUI={false}
        style={{ width: '100%', height: '100%' }}
        colorScheme="DARK"
      >
        {shops.map(shop => (
          <AdvancedMarker
            key={shop.id}
            position={{ lat: Number(shop.lat), lng: Number(shop.lng) }}
            onClick={() => onShopClick?.(shop.id)}
            title={shop.shop_name}
          >
            <Pin
              background={shop.is_open ? '#10B981' : '#475569'}
              glyphColor="#fff"
              borderColor={shop.is_open ? '#059669' : '#334155'}
            />
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  )
}
