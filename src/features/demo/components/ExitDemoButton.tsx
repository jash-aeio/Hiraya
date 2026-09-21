"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/design";

/**
 * Leaves the demo persona: clears the cookie, then re-renders on the server so
 * the marker and every surface behind it are resolved without a session. The
 * refresh is the load-bearing half — the cached RSC payload would otherwise go
 * on describing someone who is no longer signed in.
 */
export function ExitDemoButton() {
  const t = useTranslations("demo");
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function exit(): Promise<void> {
    setLeaving(true);
    try {
      await fetch("/api/v1/demo/session", { method: "DELETE" });
    } finally {
      // Either way: if the call failed the cookie may still be set, and a
      // re-render is what shows the user which of the two happened.
      router.push("/");
      router.refresh();
    }
  }

  return (
    <Button variant="ghost" loading={leaving} onClick={() => void exit()} className="type-small">
      {t("exit")}
    </Button>
  );
}
