export type StatusVariant = 'ok' | 'wait' | 'bad' | 'warn' | 'info' | 'off'

export interface StatusTag {
  label: string
  variant: StatusVariant
}
