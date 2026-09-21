"use client";

import { Modal } from "./Modal";
import type { ModalProps } from "./Modal";

export type DialogProps = Omit<ModalProps, "placement">;

/** A centred modal. For a confirmation or a short form. */
export function Dialog(props: DialogProps) {
  return <Modal {...props} placement="center" />;
}
