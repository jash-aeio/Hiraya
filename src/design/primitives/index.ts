/**
 * The primitive inventory from docs/DESIGN_SYSTEM.md §6. Import from
 * `@/design` rather than reaching into a file — a near-duplicate component is
 * how a design system dies, and a barrel makes the existing one easy to find.
 */
export { Avatar } from "./Avatar";
export type { AvatarProps, AvatarSize } from "./Avatar";
export { Badge, ToneIcon } from "./Badge";
export type { BadgeProps, BadgeTone } from "./Badge";
export { Button } from "./Button";
export type { ButtonProps } from "./Button";
// Plain module, not the client one: a Server Component styling a `next/link`
// cannot call a function exported from a "use client" file.
export { buttonClass } from "./buttonClass";
export type { ButtonSize, ButtonVariant } from "./buttonClass";
export { Card, CardFooter, CardHeader } from "./Card";
export type { CardHeaderProps, CardProps } from "./Card";
export { Checkbox } from "./Checkbox";
export type { CheckboxProps } from "./Checkbox";
export { Chip } from "./Chip";
export type { ChipProps, OrgCategory } from "./Chip";
export { Dialog } from "./Dialog";
export type { DialogProps } from "./Dialog";
export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";
export { FieldShell, controlClass, describedBy, useFieldIds } from "./Field";
export type { FieldShellProps } from "./Field";
export { IconButton } from "./IconButton";
export type { IconButtonProps, IconButtonVariant } from "./IconButton";
export { Input } from "./Input";
export type { InputProps } from "./Input";
export { Modal } from "./Modal";
export type { ModalPlacement, ModalProps } from "./Modal";
export { ProgressBar } from "./ProgressBar";
export type { ProgressBarProps } from "./ProgressBar";
export { Radio, RadioGroup } from "./Radio";
export type { RadioGroupProps, RadioProps } from "./Radio";
export { Select } from "./Select";
export type { SelectOption, SelectProps } from "./Select";
export { Sheet } from "./Sheet";
export type { SheetProps } from "./Sheet";
export { Skeleton } from "./Skeleton";
export type { SkeletonProps } from "./Skeleton";
export { Spinner } from "./Spinner";
export type { SpinnerProps } from "./Spinner";
export { Switch } from "./Switch";
export type { SwitchProps } from "./Switch";
export { Tabs } from "./Tabs";
export type { TabItem, TabsProps } from "./Tabs";
export { Textarea } from "./Textarea";
export type { TextareaProps } from "./Textarea";
export { ToastProvider, useToast } from "./Toast";
export type { ToastInput, ToastTone } from "./Toast";
