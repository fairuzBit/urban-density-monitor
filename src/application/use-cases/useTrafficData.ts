"use client";

// src/application/use-cases/useTrafficData.ts

import { useState, useEffect, useCallback } from "react";
import type { DashboardData, TrafficMetric, AlertStatus } from "@/domain/entities/TrafficMetric";
import { fetchDashboardData } from "@/infrastructure/services/trafficMockService";

interface UseTrafficDataResult {
  data: DashboardData | null;
  frameBase64: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  lastFetchedAt: Date | null;
}

export function useTrafficData(streamId: string): UseTrafficDataResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [frameBase64, setFrameBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    try {
      const mockData = await fetchDashboardData();
      
      // Add slight randomness to make it look "live"
      const randomizedMetrics = mockData.metrics.map(m => {
        if (typeof m.value === 'number') {
           const variation = Math.floor(m.value * 0.05 * (Math.random() > 0.5 ? 1 : -1));
           return { ...m, value: Math.max(0, m.value + variation) };
        }
        return m;
      });

      setData({
        ...mockData,
        metrics: randomizedMetrics,
        lastUpdated: new Date().toISOString()
      });
      setLastFetchedAt(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch mock data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    let isMounted = true;
    let timer: NodeJS.Timeout;

    async function initialLoad() {
      if (!isMounted) return;
      await loadData();
      if (!isMounted) return;
      
      // Poll every 3 seconds to simulate live data
      timer = setInterval(() => {
        loadData();
      }, 3000);
    }

    initialLoad();

    return () => {
      isMounted = false;
      if (timer) clearInterval(timer);
    };
  }, [streamId, loadData]);

  return {
    data,
    frameBase64, // will be null for mock data, map background handles it
    isLoading,
    error,
    refetch: () => {
      setIsLoading(true);
      loadData();
    },
    lastFetchedAt,
  };
}
