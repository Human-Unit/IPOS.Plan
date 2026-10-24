"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { Button } from "@/components/ui/button";

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn("dialog-overlay", className)}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  // Controlled dialogs can open without a Radix DialogTrigger (including from
  // an action menu). Preserve the initiating control for keyboard return.
  const captureReturnFocus = (): HTMLElement | null => {
    if (
      typeof document === "undefined" ||
      !(document.activeElement instanceof HTMLElement)
    )
      return null;
    const active = document.activeElement;
    const menu = active.closest('[role="menu"]');
    return menu?.id
      ? (document.querySelector<HTMLElement>(
          `[aria-controls="${CSS.escape(menu.id)}"]`,
        ) ?? active)
      : active;
  };
  const [initialReturnFocus] = React.useState(captureReturnFocus);
  const returnFocusRef = React.useRef(initialReturnFocus);
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn("dialog-panel", className)}
        {...props}
        onOpenAutoFocus={(event) => {
          // Drawer content can remain mounted while closed. Capture again for
          // each opening, before Radix moves focus into the dialog. Keep the
          // mount-time menu trigger when a dismissed menu has focused body.
          const active = captureReturnFocus();
          if (active && active !== document.body) returnFocusRef.current = active;
          onOpenAutoFocus?.(event);
        }}
        onInteractOutside={(event) => {
          // Sonner notifications remain operable while this modal is open.
          // Closing a notification is not a request to dismiss the document dialog.
          if (
            (event.target as HTMLElement | null)?.closest(
              "[data-sonner-toaster]",
            )
          )
            event.preventDefault();
          props.onInteractOutside?.(event);
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          if (!event.defaultPrevented && returnFocusRef.current?.isConnected) {
            event.preventDefault();
            returnFocusRef.current.focus({ preventScroll: true });
          }
        }}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="dialog-close"
          >
            <XIcon />
            <span className="sr-only">Закрыть</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("dialog-header", className)}
      {...props}
    />
  );
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("dialog-body", className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("dialog-footer", className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Закрыть</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("dialog-title", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("dialog-description", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
