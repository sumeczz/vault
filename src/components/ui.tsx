import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";
import clsx from "clsx";

export type ButtonVariant = "primary" | "secondary" | "danger" | "subtle";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  fullWidth?: boolean;
}

/** Shared action button. Use one visual variant consistently across every screen. */
export function Button({
  variant = "secondary",
  size = "md",
  icon,
  fullWidth = false,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx("vb-ui-button", `vb-ui-button--${variant}`, `vb-ui-button--${size}`, fullWidth && "vb-ui-button--full", className)}
      {...props}
    >
      {icon ? <span className="vb-ui-button__icon" aria-hidden="true">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}

export type PanelTone = "default" | "raised" | "success" | "danger";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: PanelTone;
  padding?: "none" | "sm" | "md" | "lg";
}

/** Shared surface for grouped content; avoid one-off card treatments. */
export function Panel({
  tone = "default",
  padding = "md",
  className,
  ...props
}: PanelProps) {
  return (
    <div
      className={clsx("vb-ui-panel", `vb-ui-panel--${tone}`, `vb-ui-panel--pad-${padding}`, className)}
      {...props}
    />
  );
}

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "rarity";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

/** Compact status label. Rarity colors are supplied through --vb-rarity-color. */
export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={clsx("vb-ui-badge", `vb-ui-badge--${tone}`, className)} {...props}>
      {dot ? <span className="vb-ui-badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  label?: string;
  valueText?: string;
  tone?: "hp" | "xp" | "success" | "danger" | "accent";
}

/** Accessible, shared progress indicator with a bounded numeric value. */
export function ProgressBar({
  value,
  max = 100,
  label,
  valueText,
  tone = "accent",
  className,
  ...props
}: ProgressBarProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? Math.min(safeMax, Math.max(0, value)) : 0;
  const percentage = (safeValue / safeMax) * 100;

  return (
    <div className={clsx("vb-ui-progress", className)} {...props}>
      {label || valueText ? (
        <div className="vb-ui-progress__meta">
          {label ? <span>{label}</span> : <span />}
          {valueText ? <span className="vb-ui-progress__value">{valueText}</span> : null}
        </div>
      ) : null}
      <div
        className="vb-ui-progress__track"
        role="progressbar"
        aria-label={label ?? "Postup"}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
      >
        <div className={`vb-ui-progress__fill vb-ui-progress__fill--${tone}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export interface SectionHeadingProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}

/** Consistent heading hierarchy for panels and screen sections. */
export function SectionHeading({
  title,
  eyebrow,
  action,
  className,
  ...props
}: SectionHeadingProps) {
  return (
    <div className={clsx("vb-ui-section-heading", className)} {...props}>
      <div className="vb-ui-section-heading__copy">
        {eyebrow ? <span className="vb-ui-section-heading__eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
      </div>
      {action ? <div className="vb-ui-section-heading__action">{action}</div> : null}
    </div>
  );
}

export interface ScreenHeaderProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
}

/** Standard header shared by all non-combat game screens. */
export function ScreenHeader({
  eyebrow,
  title,
  description,
  icon,
  className,
  ...props
}: ScreenHeaderProps) {
  return (
    <header className={clsx("vb-ui-screen-header", className)} {...props}>
      <div className="vb-ui-screen-header__eyebrow">
        {icon ? <span aria-hidden="true">{icon}</span> : null}
        {eyebrow}
      </div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </header>
  );
}
