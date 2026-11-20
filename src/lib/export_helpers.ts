"use client";

/**
 * Shared client-side clipboard, file download, and popup-free printing helpers.
 * Designed to work reliably across desktop browsers, mobile Safari/Chrome, and PWAs.
 */

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to legacy textarea copy
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

export function downloadBlobFile(
  content: string,
  filename: string,
  mimeType: string = "text/plain;charset=utf-8"
): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Defer URL revocation so Safari, Firefox, and mobile browsers finish reading the Blob
    window.setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore cleanup error
      }
    }, 2500);
    return true;
  } catch {
    return false;
  }
}

/**
 * Prints an HTML document using an invisible same-origin iframe.
 * Never triggers popup blockers (unlike window.open) and never leaves blank tabs behind.
 * Falls back to downloading a standalone printable HTML file if native printing is unavailable.
 */
export function printHtmlDocument(
  html: string,
  fallbackFilename: string
): { ok: boolean; method: "print" | "download" } {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return { ok: false, method: "print" };
  }

  try {
    const existing = document.getElementById("winconcept-print-frame");
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    const iframe = document.createElement("iframe");
    iframe.id = "winconcept-print-frame";
    iframe.title = "Printable Betting Slips";
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
    const frameWin = iframe.contentWindow;
    if (!frameDoc || !frameWin || typeof frameWin.print !== "function") {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      const downloaded = downloadBlobFile(html, fallbackFilename, "text/html;charset=utf-8");
      return { ok: downloaded, method: "download" };
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      window.setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 500);
    };

    try {
      frameWin.addEventListener("afterprint", cleanup, { once: true });
    } catch {
      // Ignore if afterprint is unsupported
    }

    window.setTimeout(() => {
      try {
        frameWin.focus();
        frameWin.print();
      } catch {
        downloadBlobFile(html, fallbackFilename, "text/html;charset=utf-8");
      }
    }, 150);

    // Guaranteed cleanup even if afterprint never fires (e.g., iOS Safari)
    window.setTimeout(cleanup, 60_000);
    return { ok: true, method: "print" };
  } catch {
    const downloaded = downloadBlobFile(html, fallbackFilename, "text/html;charset=utf-8");
    return { ok: downloaded, method: "download" };
  }
}
