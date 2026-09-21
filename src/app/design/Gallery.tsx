"use client";

import { CalendarDays, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ReactNode } from "react";

import {
  Avatar,
  Badge,
  Button,
  Card,
  CardFooter,
  CardHeader,
  Checkbox,
  Chip,
  Dialog,
  EmptyState,
  IconButton,
  Input,
  ProgressBar,
  Radio,
  RadioGroup,
  Select,
  Sheet,
  Skeleton,
  Spinner,
  Switch,
  Tabs,
  Textarea,
  useToast,
} from "@/design";
import type { OrgCategory } from "@/design";

const CATEGORIES: readonly OrgCategory[] = [
  "academic",
  "arts",
  "sports",
  "service",
  "faith",
  "interest",
];

/*
 * Swatches name their token rather than their value. The hex then lives in exactly
 * one place — tokens.css — and a swatch that had drifted out of step with it would
 * be invisible here, which is the opposite of what a gallery is for.
 */
const SWATCHES: readonly string[] = [
  "bg-canvas",
  "bg-surface",
  "bg-surface-sunk",
  "bg-primary",
  "bg-primary-soft",
  "bg-xp",
  "bg-success",
  "bg-warning",
  "bg-danger",
  "bg-info",
];

const TYPE_STYLES: readonly string[] = [
  "type-display",
  "type-h1",
  "type-h2",
  "type-h3",
  "type-body",
  "type-body-strong",
  "type-small",
  "type-label",
  "type-numeral",
];

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="type-label mb-3 text-ink-muted">{heading}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function Gallery() {
  const t = useTranslations("design");
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notify, setNotify] = useState(true);
  const [selected, setSelected] = useState<OrgCategory | null>("sports");

  return (
    <>
      <Section heading={t("colour")}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {SWATCHES.map((swatch) => (
            <div key={swatch} className="rounded-md border border-border p-2">
              <div className={"mb-2 h-10 rounded-sm border border-border " + swatch} />
              <code className="type-small text-ink-muted">{swatch}</code>
            </div>
          ))}
        </div>
        <p className="type-small text-ink-muted">{t("colourNote")}</p>
      </Section>

      <Section heading={t("type")}>
        <Card>
          <div className="flex flex-col gap-3">
            {TYPE_STYLES.map((style) => (
              <div key={style} className="flex flex-wrap items-baseline gap-3">
                <code className="type-small w-36 shrink-0 text-ink-muted">{style}</code>
                <span className={style + " text-ink"} data-numeric>
                  {t("sample")}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section heading={t("buttons")}>
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <Button>{t("primary")}</Button>
            <Button variant="secondary">{t("secondary")}</Button>
            <Button variant="ghost">{t("ghost")}</Button>
            <Button variant="danger">{t("danger")}</Button>
            <Button loading>{t("loading")}</Button>
            <Button disabled>{t("disabled")}</Button>
            <Button leadingIcon={<Plus className="size-4" aria-hidden="true" />}>
              {t("withIcon")}
            </Button>
            <IconButton label={t("iconOnly")} icon={<CalendarDays className="size-5" />} />
          </div>
        </Card>
      </Section>

      <Section heading={t("form")}>
        <Card>
          <div className="flex flex-col gap-4">
            <Input
              label={t("fieldLabel")}
              placeholder={t("fieldPlaceholder")}
              hint={t("fieldHint")}
            />
            <Input
              label={t("fieldLabel")}
              defaultValue="7-Sampaguita"
              error={t("fieldError")}
              required
              requiredLabel={t("requiredWord")}
            />
            <Select
              label={t("selectLabel")}
              placeholder={t("selectPlaceholder")}
              defaultValue=""
              options={CATEGORIES.map((category) => ({
                value: category,
                label: t("cat." + category),
              }))}
            />
            <Textarea label={t("textareaLabel")} hint={t("textareaHint")} />
            <Checkbox label={t("checkboxLabel")} hint={t("checkboxHint")} />
            <RadioGroup legend={t("radioLegend")} hint={t("radioHint")}>
              <Radio name="gallery-radio" value="in" label={t("radioIn")} defaultChecked />
              <Radio name="gallery-radio" value="out" label={t("radioOut")} />
            </RadioGroup>
            <Switch
              checked={notify}
              onChange={setNotify}
              label={t("switchLabel")}
              hint={t("switchHint")}
            />
          </div>
        </Card>
      </Section>

      <Section heading={t("status")}>
        <Card>
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge tone="success">{t("approved")}</Badge>
            <Badge tone="pending">{t("pending")}</Badge>
            <Badge tone="warning">{t("needsReview")}</Badge>
            <Badge tone="danger">{t("rejected")}</Badge>
            <Badge tone="info">{t("info")}</Badge>
            <Badge>{t("neutral")}</Badge>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <Chip
                key={category}
                category={category}
                selected={selected === category}
                onToggle={() => setSelected(selected === category ? null : category)}
              >
                {t("cat." + category)}
              </Chip>
            ))}
          </div>

          <ProgressBar value={120} max={200} label={t("progressLabel")} valueLabel="120 / 200" />

          <div className="mt-4 flex items-center gap-4">
            <Spinner label={t("loading")} />
            <Avatar name="Ana Reyes" />
            <Avatar name="Miguel Santos" size="sm" />
            <Avatar name="Joy Dela Cruz" size="lg" />
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Skeleton className="w-2/3" label={t("loading")} />
            <Skeleton className="w-1/2" />
            <Skeleton variant="block" className="h-16" />
          </div>

          <CardFooter>
            <Button
              variant="secondary"
              onClick={() => toast({ message: t("toastSaved"), tone: "success" })}
            >
              {t("toastTrigger")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => toast({ message: t("toastFailed"), tone: "danger" })}
            >
              {t("toastErrorTrigger")}
            </Button>
          </CardFooter>
        </Card>
      </Section>

      <Section heading={t("containers")}>
        <Card>
          <CardHeader
            as="h3"
            label={t("cardLabel")}
            title={t("cardTitle")}
            description={t("cardDescription")}
            action={<IconButton label={t("iconOnly")} icon={<Plus className="size-5" />} />}
          />
          <p className="type-body text-ink-muted">{t("cardBody")}</p>
        </Card>

        <Tabs
          items={[
            { value: "upcoming", label: t("tabUpcoming"), count: 3 },
            { value: "past", label: t("tabPast") },
          ]}
        >
          {(value) =>
            value === "upcoming" ? (
              <Card elevation="flat">
                <p className="type-body text-ink">{t("tabUpcomingBody")}</p>
              </Card>
            ) : (
              <EmptyState
                title={t("emptyTitle")}
                description={t("emptyDescription")}
                art={<CalendarDays className="size-10" aria-hidden="true" />}
              />
            )
          }
        </Tabs>

        <Card>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>
              {t("openDialog")}
            </Button>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              {t("openSheet")}
            </Button>
          </div>
        </Card>
      </Section>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={t("dialogTitle")}
        description={t("dialogDescription")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={() => setDialogOpen(false)}>{t("confirm")}</Button>
          </>
        }
      />

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={t("sheetTitle")}>
        <p className="type-body text-ink-muted">{t("sheetBody")}</p>
      </Sheet>
    </>
  );
}
