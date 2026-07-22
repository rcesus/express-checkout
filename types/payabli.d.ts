export {};

declare global {
  interface Window {
    PayabliComponent: new (config: Record<string, unknown>) => {
      updateConfig: (config: Record<string, unknown>) => void;
    };
  }
}
