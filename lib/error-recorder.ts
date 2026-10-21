export type AppErrorEntry = {
  time: string;
  message: string;
};

const recentErrors: AppErrorEntry[] = [];
let installed = false;

function stringifyError(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ""}`;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function recordAppError(value: unknown) {
  recentErrors.push({ time: new Date().toISOString(), message: stringifyError(value).slice(0, 3000) });
  if (recentErrors.length > 25) recentErrors.splice(0, recentErrors.length - 25);
}

export function getRecentAppErrors(): AppErrorEntry[] {
  return [...recentErrors];
}

export function installErrorCapture() {
  if (installed) return;
  installed = true;
  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    recordAppError(args.map(stringifyError).join(" "));
    originalConsoleError(...args);
  };

  const errorUtils = (globalThis as typeof globalThis & {
    ErrorUtils?: {
      getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
      setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
    };
  }).ErrorUtils;
  const previousHandler = errorUtils?.getGlobalHandler?.();
  errorUtils?.setGlobalHandler?.((error, isFatal) => {
    recordAppError(`${isFatal ? "Fatal: " : ""}${stringifyError(error)}`);
    previousHandler?.(error, isFatal);
  });
}
