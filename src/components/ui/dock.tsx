"use client"

import React, { PropsWithChildren, useRef, useState } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, AnimatePresence } from "motion/react"

import { cn } from "@/lib/utils"

export interface DockProps extends VariantProps<typeof dockVariants> {
  className?: string
  iconSize?: number
  direction?: "top" | "middle" | "bottom"
  children: React.ReactNode
}

const DEFAULT_SIZE = 36

const dockVariants = cva(
  "mx-auto flex h-[54px] w-max items-center justify-center gap-1.5 rounded-xl border p-2"
)

const Dock = React.forwardRef<HTMLDivElement, DockProps>(
  (
    {
      className,
      children,
      iconSize = DEFAULT_SIZE,
      direction = "middle",
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        {...props}
        className={cn(dockVariants({ className }), {
          "items-start": direction === "top",
          "items-center": direction === "middle",
          "items-end": direction === "bottom",
        })}
      >
        {children}
      </div>
    )
  }
)

Dock.displayName = "Dock"

export interface DockIconProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> {
  size?: number
  label?: string
  className?: string
  children?: React.ReactNode
  props?: PropsWithChildren
}

const DockIcon = ({
  size = DEFAULT_SIZE,
  label,
  className,
  children,
  ...props
}: DockIconProps) => {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className={cn(
        "relative flex items-center cursor-pointer rounded-lg transition-all duration-200",
        className
      )}
      style={{ height: size }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...props}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center flex-shrink-0 transition-all duration-200"
        style={{ width: size, height: size }}
      >
        {children}
        {/* Shimmer sweep on hover */}
        {hovered && (
          <div
            className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none"
            style={{ opacity: 0.15 }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 55%, transparent 60%)',
                backgroundSize: '200% 100%',
                animation: 'dockShimmer 1.5s ease-in-out',
              }}
            />
          </div>
        )}
      </div>

      {/* Label — slides out to the right on hover */}
      <AnimatePresence>
        {hovered && label && (
          <motion.span
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-[10px] font-medium whitespace-nowrap overflow-hidden flex-shrink-0 pr-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

DockIcon.displayName = "DockIcon"

export { Dock, DockIcon, dockVariants }
