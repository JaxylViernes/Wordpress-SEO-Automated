declare global {
  interface Window {
    enhancedAiFixProgress?: {
      start: () => void;
      close: () => void;
      updateProgress: (data: any) => void;
      showDialog: () => void;
    };
  }
}

export {};