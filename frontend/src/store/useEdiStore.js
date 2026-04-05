import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useEdiStore = create(
  persist(
    (set) => ({
      parsedData: null,
      batchData: [],
      setParsedData: (data) => set({ parsedData: data }),
      clearParsedData: () => set({ parsedData: null }),
      setBatchData: (data) => set({ batchData: Array.isArray(data) ? data : [] }),
      clearBatchData: () => set({ batchData: [] }),
    }),
    {
      name: 'claimcraft-edi-store',
      partialize: (state) => ({
        parsedData: state.parsedData,
        batchData: state.batchData,
      }),
    },
  ),
)
