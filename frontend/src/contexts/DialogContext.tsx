import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import ConfirmationModal from "../components/ConfirmationModal";

type DialogConfig = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type DialogRequest = DialogConfig & {
  mode: "alert" | "confirm";
  resolve: (confirmed: boolean) => void;
};

type DialogContextValue = {
  showAlert: (config: DialogConfig) => Promise<void>;
  showConfirm: (config: DialogConfig) => Promise<boolean>;
};

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [currentDialog, setCurrentDialog] = useState<DialogRequest | null>(null);

  const showAlert = useCallback((config: DialogConfig) => {
    return new Promise<void>((resolve) => {
      setCurrentDialog({
        ...config,
        mode: "alert",
        resolve: () => resolve(),
      });
    });
  }, []);

  const showConfirm = useCallback((config: DialogConfig) => {
    return new Promise<boolean>((resolve) => {
      setCurrentDialog({
        ...config,
        mode: "confirm",
        resolve,
      });
    });
  }, []);

  const closeDialog = useCallback(() => {
    if (!currentDialog) return;

    currentDialog.resolve(false);
    setCurrentDialog(null);
  }, [currentDialog]);

  const confirmDialog = useCallback(() => {
    if (!currentDialog) return;

    currentDialog.resolve(true);
    setCurrentDialog(null);
  }, [currentDialog]);

  const value = useMemo(
    () => ({ showAlert, showConfirm }),
    [showAlert, showConfirm]
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      <ConfirmationModal
        open={Boolean(currentDialog)}
        onClose={closeDialog}
        onConfirm={confirmDialog}
        title={currentDialog?.title ?? ""}
        message={currentDialog?.message ?? ""}
        confirmText={currentDialog?.confirmText ?? (currentDialog?.mode === "alert" ? "OK" : "Confirm")}
        cancelText={currentDialog?.cancelText ?? "Cancel"}
        danger={currentDialog?.danger ?? false}
        hideCancel={currentDialog?.mode === "alert"}
      />
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
}
