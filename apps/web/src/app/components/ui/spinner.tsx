import { LoaderCircle } from "lucide-react";
import { cn } from "@/app/utils/cn";

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle size={16} aria-hidden className={cn("animate-spin", className)} />;
}
