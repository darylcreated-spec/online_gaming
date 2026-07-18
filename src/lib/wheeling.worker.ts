import { generateWheel } from "./wheeling";

self.addEventListener("message", (e: MessageEvent) => {
  const { pool, strategy } = e.data;
  try {
    const result = generateWheel(pool, strategy);
    self.postMessage({ success: true, result });
  } catch (err: any) {
    self.postMessage({ success: false, error: err.message || "Calculation error" });
  }
});
