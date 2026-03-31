import { useEffect, useState } from "react";
import { subDays, startOfDay, endOfDay, format, parse } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export type ReportDateRangeConfirm = {
  startMs: number;
  endMs: number;
  label: string;
};

function formatRangeLabel(start: Date, end: Date) {
  return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (range: ReportDateRangeConfirm) => void;
  title?: string;
  description?: string;
};

export function ReportDateRangeDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Download report",
  description = "Choose which dates to include in the PDF. Default is the last 30 days.",
}: Props) {
  const { toast } = useToast();
  const [from, setFrom] = useState(() => format(subDays(startOfDay(new Date()), 30), "yyyy-MM-dd"));
  const [to, setTo] = useState(() => format(startOfDay(new Date()), "yyyy-MM-dd"));

  useEffect(() => {
    if (!open) return;
    const t = startOfDay(new Date());
    setFrom(format(subDays(t, 30), "yyyy-MM-dd"));
    setTo(format(t, "yyyy-MM-dd"));
  }, [open]);

  const applyPreset = (days: number) => {
    const t = startOfDay(new Date());
    setFrom(format(subDays(t, days), "yyyy-MM-dd"));
    setTo(format(t, "yyyy-MM-dd"));
  };

  const handleDownload = () => {
    const start = startOfDay(parse(from, "yyyy-MM-dd", new Date()));
    const end = endOfDay(parse(to, "yyyy-MM-dd", new Date()));
    if (start.getTime() > end.getTime()) {
      toast({ title: "Invalid range", description: "Start date must be on or before end date.", variant: "destructive" });
      return;
    }
    onConfirm({ startMs: start.getTime(), endMs: end.getTime(), label: formatRangeLabel(start, end) });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 py-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset(7)}>
            Last 7 days
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset(30)}>
            Last 30 days
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset(90)}>
            Last 90 days
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="report-from">From</Label>
            <input
              id="report-from"
              type="date"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-to">To</Label>
            <input
              id="report-to"
              type="date"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleDownload}>
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
