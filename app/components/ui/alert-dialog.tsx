import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { mergeRenderStyle, resolveAsChild } from "@/components/ui/render-helpers";
import { cn } from "@/lib/cn";

const AlertDialog = ({ ...props }: AlertDialogPrimitive.Root.Props) => (
  <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
);

const AlertDialogTrigger = ({
  asChild = false,
  children,
  ...props
}: AlertDialogPrimitive.Trigger.Props & {
  asChild?: boolean;
}) => {
  const { children: renderedChildren, render } = resolveAsChild(children, asChild);

  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" render={render} {...props}>
      {renderedChildren}
    </AlertDialogPrimitive.Trigger>
  );
};

const AlertDialogPortal = ({ ...props }: AlertDialogPrimitive.Portal.Props) => (
  <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
);

const AlertDialogOverlay = ({
  className,
  style,
  ...props
}: AlertDialogPrimitive.Backdrop.Props) => (
  <AlertDialogPrimitive.Backdrop
    className={cn(
      "fixed inset-0 z-50 bg-black/50 data-closed:animate-out data-closed:fade-out-0 data-open:animate-in data-open:fade-in-0",
      className,
    )}
    data-slot="alert-dialog-overlay"
    style={mergeRenderStyle<AlertDialogPrimitive.Backdrop.State>(
      {
        inset: 0,
        position: "fixed",
        zIndex: 50,
      },
      style,
    )}
    {...props}
  />
);

const AlertDialogContent = ({ className, style, ...props }: AlertDialogPrimitive.Popup.Props) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Popup
      className={cn(
        "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 sm:max-w-lg",
        className,
      )}
      data-slot="alert-dialog-content"
      style={mergeRenderStyle<AlertDialogPrimitive.Popup.State>(
        {
          left: "50%",
          maxWidth: "calc(100% - 2rem)",
          position: "fixed",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          zIndex: 51,
        },
        style,
      )}
      {...props}
    />
  </AlertDialogPortal>
);

const AlertDialogHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
    data-slot="alert-dialog-header"
    {...props}
  />
);

const AlertDialogFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
    data-slot="alert-dialog-footer"
    {...props}
  />
);

const AlertDialogTitle = ({ className, ...props }: AlertDialogPrimitive.Title.Props) => (
  <AlertDialogPrimitive.Title
    className={cn("text-lg font-semibold", className)}
    data-slot="alert-dialog-title"
    {...props}
  />
);

const AlertDialogDescription = ({
  className,
  ...props
}: AlertDialogPrimitive.Description.Props) => (
  <AlertDialogPrimitive.Description
    className={cn("text-sm text-muted-foreground", className)}
    data-slot="alert-dialog-description"
    {...props}
  />
);

const AlertDialogAction = ({ className, ...props }: React.ComponentProps<typeof Button>) => (
  <Button className={cn(className)} data-slot="alert-dialog-action" {...props} />
);

const AlertDialogCancel = ({
  className,
  size = "default",
  variant = "outline",
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<React.ComponentProps<typeof Button>, "size" | "variant">) => (
  <AlertDialogPrimitive.Close
    className={cn(className)}
    data-slot="alert-dialog-cancel"
    render={<Button size={size} variant={variant} />}
    {...props}
  />
);

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
};
