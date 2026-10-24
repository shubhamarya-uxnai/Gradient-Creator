import type { ButtonHTMLAttributes, ReactNode } from "react"
import {
  Button as DSButton,
  IconButton as DSIconButton,
  InputField as DSInputField,
  Selection as DSSelection,
  Chip as DSChip,
  ProgressBar as DSProgressBar,
  ProgressPie as DSProgressPie,
  ProgressDonut as DSProgressDonut,
  Loader as DSLoader,
  Loaders as DSLoaders,
  SegmentedChild as DSSegmentedChild,
  StepperChild as DSStepperChild,
  SegmentedProgress as DSSegmentedProgress,
  Stepper as DSStepper,
} from "@ba-design-system/react"

/** The only product to design-system component mapping. */
type ActionBase = Pick<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "title" | "className" | "id" | "aria-label"> & {
  disabled?: boolean
  variant?: "primary" | "default" | "ghost"
  size?: "large" | "small"
}

export function ActionButton({ variant = "ghost", size = "small", disabled, children, ...props }: ActionBase & { children: ReactNode }) {
  return <DSButton {...props} Type={variant === "primary" ? "Primary" : variant === "default" ? "Default" : "Ghost"} Size={size === "large" ? "Large" : "Small"} Enabled={!disabled} {...{ "Leading Icon": false, "Tailing Icon": false }}>{children}</DSButton>
}

export function IconAction({ variant = "ghost", size = "small", disabled, icon, ...props }: ActionBase & { icon: string }) {
  return <DSIconButton {...props} Type={variant === "primary" ? "Primary" : variant === "default" ? "Default" : "Ghost"} Size={size === "large" ? "Large" : "Small"} Enabled={!disabled} icon={icon} />
}

export const Field = DSInputField
export const Choice = DSSelection
export const StatusChip = DSChip
export const ProgressBar = DSProgressBar
export const ProgressPie = DSProgressPie
export const ProgressDonut = DSProgressDonut
export const Loader = DSLoader
export const Loaders = DSLoaders
export const SegmentedChild = DSSegmentedChild
export const StepperChild = DSStepperChild
export const SegmentedProgress = DSSegmentedProgress
export const Stepper = DSStepper

export type SelectOption = { value: string; label: string }
export type SelectProps = { id?: string; label: string; value: string | number; options: SelectOption[]; onChange: (value: string) => void; disabled?: boolean }

/** Native select provides complete keyboard behavior until BA publishes Dropdown. */
export function Select({ id, label, value, options, onChange, disabled }: SelectProps) {
  return <label className="studio-select" htmlFor={id}>
    <span>{label}</span>
    <select id={id} value={value} disabled={disabled} onChange={event => onChange(event.target.value)}>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>
}

export function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`studio-surface ${className}`} data-ba-component="Surface">{children}</section>
}
