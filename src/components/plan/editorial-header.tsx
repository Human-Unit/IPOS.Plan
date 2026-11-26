import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "@/components/plan/brand";
import { ThemeControl } from "@/components/theme/theme-control";
import { Button } from "@/components/ui/button";

export function EditorialHeader({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <header className="app-bar dashboard-app-bar people-app-bar">
      <Brand />
      <div className="app-bar-tools">
        <Button asChild variant="ghost">
          <Link className="editorial-back" href={backHref} aria-label={backLabel}>
            <ArrowLeft aria-hidden="true" />
            <span>{backLabel}</span>
          </Link>
        </Button>
        <ThemeControl />
      </div>
    </header>
  );
}
