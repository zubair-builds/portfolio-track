"use client";

import { useState } from "react";
import { Modal } from "./Modal";

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  onCancel: () => void;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  onCancel,
  onConfirm,
}: ConfirmationDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  const confirmClasses =
    confirmVariant === "danger"
      ? "bg-rose-600 hover:bg-rose-700 text-white"
      : "bg-indigo-600 hover:bg-indigo-700 text-white";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      subtitle={typeof message === "string" ? message : undefined}
      className="max-w-xl"
    >
      <div className="space-y-6">
        {typeof message !== "string" && message}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${confirmClasses} disabled:opacity-60`}
          >
            {submitting && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
