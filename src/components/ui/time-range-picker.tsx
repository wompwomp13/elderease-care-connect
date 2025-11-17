import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { isEndAfterStart } from "@/lib/time";
import TimePicker from "@/components/ui/time-picker";

type TimeRangePickerProps = {
  start?: string | null;
  end?: string | null;
  onChange?: (next: { start: string | null; end: string | null }) => void;
  disabled?: boolean;
  startDisabled?: boolean;
  endDisabled?: boolean;
};

export const TimeRangePicker = ({ start, end, onChange, disabled, startDisabled, endDisabled }: TimeRangePickerProps) => {
  const isValid = isEndAfterStart(start ?? null, end ?? null);

  const handleStartChange = (val: string) => {
    onChange?.({ start: val, end: end ?? null });
  };
  const handleEndChange = (val: string) => {
    onChange?.({ start: start ?? null, end: val });
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TimePicker
          value={start ?? undefined}
          onChange={handleStartChange}
          disabled={Boolean(disabled || startDisabled)}
          placeholder="Start time"
          aria-label="Select start time"
        />
        <span className="text-sm text-muted-foreground select-none">to</span>
        <TimePicker
          value={end ?? undefined}
          onChange={handleEndChange}
          disabled={Boolean(disabled || endDisabled)}
          placeholder="End time"
          aria-label="Select end time"
        />
      </div>
      <p
        className={cn(
          "flex items-center gap-2 text-xs",
          isValid || !start || !end ? "text-muted-foreground" : "text-destructive",
        )}
        role={!isValid && start && end ? "alert" : undefined}
        aria-live={!isValid && start && end ? "assertive" : "off"}
      >
        {!start || !end ? "Select both start and end times" : isValid ? "" : (
          <span className="inline-flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> End time must be after start time</span>
        )}
      </p>
    </div>
  );
};

export default TimeRangePicker;


