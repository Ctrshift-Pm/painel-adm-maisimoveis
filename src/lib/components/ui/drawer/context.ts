export type DrawerDirection = 'left' | 'right' | 'top' | 'bottom';

export interface DrawerContextValue {
  direction: DrawerDirection;
  close: () => void;
}

export const DRAWER_CONTEXT_KEY = Symbol('drawer-context');
