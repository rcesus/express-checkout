export {};

declare global {
  // The sandbox component.js declares PayabliComponent as a bare global (a class),
  // so it is not attached to window. Reference it directly.
  const PayabliComponent: new (config: Record<string, unknown>) => {
    updateConfig: (config: Record<string, unknown>) => void;
  };
}
