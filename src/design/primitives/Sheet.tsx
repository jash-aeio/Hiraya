"use client";

import { Modal } from "./Modal";
import type { ModalProps } from "./Modal";

export type SheetProps = Omit<ModalProps, "placement">;

/**
 * A bottom sheet. Preferred over `Dialog` on a phone for anything with more than
 * two controls: it opens where the thumb already is, and it does not shrink the
 * form to the middle third of the screen.
 */
export function Sheet(props: SheetProps) {
  return <Modal {...props} placement="bottom" />;
}
