import { cn } from "@/lib/utils";

interface PageContainerProps extends React.ComponentProps<"div"> {
  title?: string;
  description?: string;
}

export function PageContainer({ title, description, className, children, ...props }: PageContainerProps) {
  return (
    <div className={cn("flex flex-1 flex-col gap-6 p-6 md:p-8", className)} {...props}>
      {(title || description) && (
        <div className="flex flex-col gap-1">
          {title && <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
