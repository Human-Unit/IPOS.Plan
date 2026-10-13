import { FileText } from "lucide-react";
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <FileText size={20} />
      </span>
      <span>
        IPOS<span className="brand-divider">/</span>
        <span className="brand-description">Контент-планы</span>
      </span>
    </div>
  );
}
