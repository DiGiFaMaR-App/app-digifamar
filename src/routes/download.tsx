import { createFileRoute } from "@tanstack/react-router";
import apk from "@/assets/digifamar-apk.asset.json";
import { Button } from "@/components/ui/button";
import { Download, Smartphone } from "lucide-react";

export const Route = createFileRoute("/download")({
  component: DownloadPage,
  head: () => ({
    meta: [
      { title: "Download DiGiFaMaR Android App" },
      {
        name: "description",
        content:
          "Install the DiGiFaMaR Android app — America's Farmers. Direct to Market. No Middlemen.",
      },
    ],
  }),
});

const sizeMb = (apk.size / (1024 * 1024)).toFixed(1);

function DownloadPage() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-xl flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="rounded-2xl bg-primary/10 p-5">
        <Smartphone className="h-10 w-10 text-primary" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">Get the DiGiFaMaR app</h1>
      <p className="text-muted-foreground">
        Install the Android app directly. America's Farmers. Direct to Market. No
        Middlemen.
      </p>

      <Button asChild size="lg" className="gap-2">
        <a href={apk.url} download="digifamar.apk">
          <Download className="h-5 w-5" />
          Download APK ({sizeMb} MB)
        </a>
      </Button>

      <div className="mt-4 w-full rounded-lg border bg-muted/30 p-4 text-left text-sm text-muted-foreground">
        <p className="mb-2 font-medium text-foreground">How to install</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Tap the download button above on your Android device.</li>
          <li>
            When prompted, allow installing apps from your browser (Settings →
            Install unknown apps).
          </li>
          <li>Open the downloaded file and tap <strong>Install</strong>.</li>
        </ol>
        <p className="mt-3 text-xs">
          iOS app coming soon. Until then, use{" "}
          <a href="/" className="underline">
            app.digifamar.com
          </a>{" "}
          in Safari and tap Share → Add to Home Screen.
        </p>
      </div>
    </main>
  );
}
