import { useState } from "react";
import { FileText, ImageOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type IdDocumentViewProps = {
  url: string | null;
  fileName?: string | null;
  name: string;
  /** Optional class for the container (e.g. for sizing) */
  className?: string;
};

export const IdDocumentView = ({ url, fileName, name, className = "" }: IdDocumentViewProps) => {
  const [open, setOpen] = useState(false);
  const isPdf = (fileName ?? "").toLowerCase().endsWith(".pdf");

  if (!url) {
    return (
      <div
        className={`w-full aspect-video rounded-xl border-2 border-dashed border-muted bg-muted/20 flex flex-col items-center justify-center gap-2 text-muted-foreground ${className}`}
      >
        <ImageOff className="h-10 w-10" />
        <span className="text-xs text-center px-2">No ID provided</span>
        {fileName && <span className="text-[10px]">(legacy)</span>}
      </div>
    );
  }

  return (
    <>
      {isPdf ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`w-full aspect-video rounded-xl border-2 border-muted bg-muted/30 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer shadow-sm ${className}`}
        >
          <FileText className="h-10 w-10 text-muted-foreground" />
          <span className="text-xs font-medium text-center px-2">PDF</span>
          <span className="text-[10px] text-muted-foreground">Click to view</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`w-full aspect-video rounded-xl border-2 border-muted overflow-hidden bg-muted/20 hover:border-primary/50 transition-all group cursor-pointer text-left block shadow-sm ${className}`}
        >
          <img
            src={url}
            alt={`ID for ${name}`}
            className="w-full h-full object-contain bg-muted/30 group-hover:scale-[1.02] transition-transform duration-200"
          />
          <span className="sr-only">Click to view full size</span>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 [&>button]:right-2 [&>button]:top-2">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>ID Document — {name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto px-6 pb-6">
            {isPdf ? (
              <iframe
                src={url}
                title={`ID for ${name}`}
                className="w-full aspect-video min-h-[400px] rounded-lg border bg-muted"
              />
            ) : (
              <img
                src={url}
                alt={`ID for ${name}`}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
