import type { Writable } from 'svelte/store';

export interface SelectContext {
  value: Writable<string>;
  selectedLabel: Writable<string>;
  placeholder: string;
  isOpen: Writable<boolean>;
  disabled: boolean;
  toggle: () => void;
  close: () => void;
  registerItem: (value: string, label: string) => void;
  selectItem: (value: string, label: string) => void;
}

export const SELECT_CONTEXT_KEY = Symbol('select-context');
