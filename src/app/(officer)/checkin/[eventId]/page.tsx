import { registerAttrs } from "@/design";
import { ScannerScreen } from "@/features/checkin/components/ScannerScreen";

/**
 * /checkin/[eventId] — the gate itself (P-02, D24).
 *
 * The shell is static and the screen inside it is a client component: it has to
 * open fast, stay open between scans, and keep working when the network does not
 * (CLAUDE.md R3, DESIGN_SYSTEM.md §12 — the scanner route opens in under two
 * seconds).
 */
export default async function ScannerPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  return (
    <main
      {...registerAttrs("staff")}
      className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-4 py-8"
    >
      <ScannerScreen eventId={eventId} />
    </main>
  );
}
