"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CopyButton({
  value,
  label,
  variant = "secondary",
  size = "icon",
  className,
}: {
  value: string;
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard can be blocked (insecure origin, denied permission) —
      // leave the button in its idle state rather than lying about success.
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={copy}
      disabled={!value}
      className={className}
      aria-label={label ?? "Copy to clipboard"}
    >
      {copied ? <Check /> : <Copy />}
      {label ? <span>{copied ? "Copied" : label}</span> : null}
    </Button>
  );
}
