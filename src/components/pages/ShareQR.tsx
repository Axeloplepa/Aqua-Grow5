import { useState } from "react";
import { Copy, Download } from "lucide-react";
import { CFG } from "@/lib/irrigation";
import { BTN, BTN_GHOST, Card, PageHeader } from "@/components/ui";

export function ShareQR() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(CFG.siteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link:", CFG.siteUrl);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Share" sub="Scan the QR code to open the dashboard on a phone." />
      <Card className="text-center">
        <img
          src="/qr.png"
          alt="QR code that opens the Aqua-Grow dashboard"
          className="mx-auto w-full max-w-sm rounded-2xl bg-white"
        />
        <p className="mt-4 break-all text-sm font-semibold text-muted">{CFG.siteUrl}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button onClick={() => void copy()} className={BTN}>
            <Copy size={16} /> {copied ? "Copied!" : "Copy link"}
          </button>
          <a href="/qr.png" download="aqua-grow-qr.png" className={BTN_GHOST}>
            <Download size={16} /> Download QR
          </a>
        </div>
        <p className="mt-4 text-xs text-faint">When printing, keep the white border around the code so phones can scan it.</p>
      </Card>
    </div>
  );
}
