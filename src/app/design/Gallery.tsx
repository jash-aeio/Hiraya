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
  CategoryIcon,
  Checkbox,
  Chip,
  Dialog,
  EmptyState,
  IconButton,
  Input,
  LEVEL_TITLES,
  LevelBadge,
  Logomark,
  Podium,
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
  UnlockFrame,
  Wordmark,
  XpCoin,
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
 * The category marks carry their own colour class rather than inheriting one:
 * a token class is the only way a component may reach a colour, and these are
 * the six the palette assigns (DESIGN_SYSTEM.md §10).
 */
const CATEGORY_ART: readonly { key: OrgCategory; tone: string }[] = [
  { key: "academic", tone: "text-cat-academic" },
  { key: "arts", tone: "text-cat-arts" },
  { key: "sports", tone: "text-cat-sports" },
  { key: "service", tone: "text-cat-service" },
  { key: "faith", tone: "text-cat-faith" },
  { key: "interest", tone: "text-cat-interest" },
];

const AVATARS = Array.from({ length: 14 }, (_, i) => String(i + 1).padStart(2, "0"));

const EMPTY_STATES = [
  "no-events",
  "no-orgs",
  "no-checkins",
  "no-announcements",
  "offline",
] as const;

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

      <Section heading={t("art")}>
        <Card>
          <CardHeader as="h3" label={t("artBrandLabel")} title={t("artBrand")} />
          <div className="flex flex-wrap items-center gap-6">
            <Wordmark size={32} />
            <Logomark size={48} />
            <Logomark size={24} />
          </div>
        </Card>

        <Card>
          <CardHeader as="h3" label={t("artCategoryLabel")} title={t("artCategory")} />
          <ul className="flex flex-wrap gap-5">
            {CATEGORY_ART.map(({ key, tone }) => (
              <li key={key} className="flex w-20 flex-col items-center gap-1.5 text-center">
                <CategoryIcon category={key} size={28} className={tone} />
                <span className="type-caption text-ink-muted">{t(`cat.${key}`)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader as="h3" label={t("artLevelLabel")} title={t("artLevel")} />
          <ul className="flex flex-wrap gap-6">
            {([1, 2, 3, 4] as const).map((tier) => (
              <li key={tier} className="flex flex-col items-center gap-1.5">
                <LevelBadge tier={tier} size={64} />
                <span className="type-caption text-ink-muted">{LEVEL_TITLES[tier]}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-5">
            {([1, 2, 3, 4] as const).map((tier) => (
              <UnlockFrame key={tier} tier={tier} size={44} />
            ))}
            <span className="inline-flex items-center gap-1.5">
              <XpCoin size={18} />
              <span className="type-body-strong text-xp-ink">1,250</span>
            </span>
            <Podium size={120} />
          </div>
        </Card>

        <Card>
          <CardHeader as="h3" label={t("artAvatarLabel")} title={t("artAvatar")} />
          <ul className="flex flex-wrap gap-3">
            {AVATARS.map((n) => (
              <li key={n}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/avatars/avatar-${n}.svg`}
                  width={44}
                  height={44}
                  alt=""
                  loading="lazy"
                />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader as="h3" label={t("artEmptyLabel")} title={t("artEmpty")} />
          <ul className="flex flex-wrap gap-4">
            {EMPTY_STATES.map((name) => (
              <li key={name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/empty/${name}.svg`}
                  width={140}
                  height={112}
                  alt=""
                  loading="lazy"
                  className="rounded-md bg-surface-sunk"
                />
              </li>
            ))}
          </ul>
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
