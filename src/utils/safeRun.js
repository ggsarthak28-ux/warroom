export function safeRun(fn, onError) {
  try {
    return fn();
  } catch (error) {
    console.error("Function Error:", error);
    onError?.(error);
    return undefined;
  }
}

export async function safeRunAsync(fn, onError) {
  try {
    return await fn();
  } catch (error) {
    console.error("Async Function Error:", error);
    onError?.(error);
    return undefined;
  }
}
