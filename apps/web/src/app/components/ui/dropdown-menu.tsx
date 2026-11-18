"use client";

import { DropdownMenu as Primitive } from "radix-ui";
import { cn } from "@/app/utils/cn";

export const DropdownMenu = Primitive.Root;
export const DropdownMenuTrigger = Primitive.Trigger;

export function DropdownMenuContent({ className, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={8}
        className={cn("z-50 min-w-60 animate-pop-in rounded-card bg-surface-raised p-2 shadow-2", className)}
        {...props}
      />
    </Primitive.Portal>
  );
}

/** `h-8`; o item destacado (teclado ou ponteiro) usa `sidebar-active`. */
export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      className={cn(
        "flex h-8 cursor-pointer items-center gap-2 rounded-item px-2 text-body text-fg outline-none data-[highlighted]:bg-sidebar-active data-[highlighted]:text-sidebar-on-active",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator() {
  return <Primitive.Separator className="my-2 h-px bg-border-subtle" />;
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof Primitive.Label>) {
  return <Primitive.Label className={cn("px-2 py-1", className)} {...props} />;
}
