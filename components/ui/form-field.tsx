import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

type FormFieldProps = React.HTMLAttributes<HTMLDivElement> & {
  htmlFor: string;
  label: string;
  description?: string;
  error?: string;
};

function FormField({
  htmlFor,
  label,
  description,
  error,
  className,
  children,
  ...props
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {description && (
        <p id={`${htmlFor}-description`} className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {children}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export { FormField };
