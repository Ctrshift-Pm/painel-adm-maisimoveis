import type { Writable } from 'svelte/store';

export interface DialogContextValue {
  open: Writable<boolean>;
  close: () => void;
  setOpen: (value: boolean) => void;
  closeOnOverlay: boolean;
}

export const DIALOG_CONTEXT_KEY = Symbol('dialog-context');
