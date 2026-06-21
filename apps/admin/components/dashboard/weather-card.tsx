'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  MapPin,
  Sun,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiGet } from '@/lib/api';

interface WeatherData {
  location: { name: string; country: string | null; lat: number; lon: number };
  current: {
    tempC: number;
    feelsLikeC: number;
    humidity: number;
    windMs: number;
    condition: string;
    description: string;
    icon: string;
  };
  source: 'gps' | 'ip' | 'default';
  fetchedAt: string;
}

type Coords = { lat: number; lon: number } | null;

// Map OpenWeather icon codes (https://openweathermap.org/weather-conditions) to lucide icons.
function iconFor(code: string): LucideIcon {
  const key = code.replace(/[nd]$/, '');
  switch (key) {
    case '01':
      return Sun;
    case '02':
    case '03':
    case '04':
      return Cloud;
    case '09':
      return CloudDrizzle;
    case '10':
      return CloudRain;
    case '11':
      return CloudLightning;
    case '13':
      return CloudSnow;
    case '50':
      return CloudFog;
    default:
      return Cloud;
  }
}

export function WeatherCard() {
  // Try GPS first; once the attempt settles (allow or deny) we query the API,
  // which falls back to IP-based location server-side when no coords are sent.
  const [coords, setCoords] = useState<Coords>(null);
  const [geoReady, setGeoReady] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoReady(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeoReady(true);
      },
      () => setGeoReady(true),
      { timeout: 5000, maximumAge: 10 * 60 * 1000 }
    );
  }, []);

  const { data, isLoading, isError } = useQuery<WeatherData>({
    queryKey: ['weather', coords?.lat ?? null, coords?.lon ?? null],
    queryFn: () => apiGet('/weather', coords ?? undefined),
    enabled: geoReady,
    staleTime: 10 * 60 * 1000,
  });

  const Icon = data ? iconFor(data.current.icon) : Cloud;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Погода</CardTitle>
        <Icon className="h-4 w-4 text-sky-600" />
      </CardHeader>
      <CardContent>
        {!geoReady || isLoading ? (
          <div className="text-3xl font-bold">—</div>
        ) : isError || !data ? (
          <div className="text-sm text-muted-foreground">Нет данных о погоде</div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{data.current.tempC}°C</span>
              <span className="text-sm capitalize text-muted-foreground">{data.current.description}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>
                {data.location.name}
                {data.location.country ? `, ${data.location.country}` : ''}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Droplets className="h-3 w-3" /> {data.current.humidity}%
              </span>
              <span className="flex items-center gap-1">
                <Wind className="h-3 w-3" /> {data.current.windMs} м/с
              </span>
              <span>Ощущается {data.current.feelsLikeC}°</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
