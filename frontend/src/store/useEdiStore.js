import { create } from 'zustand'

export const useEdiStore = create((set) => ({
  parsedData: null,
  setParsedData: (data) => set({ parsedData: data }),
  clearParsedData: () => set({ parsedData: null }),
}))
