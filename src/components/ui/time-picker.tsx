import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Meridiem, TimeParts, clampNumber, format12h, getPartsFrom24h, partsTo24h } from "@/lib/time";

type TimePickerProps = {
  value?: string | null; // HH:mm in 24h
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  "aria-label"?: string;
};

const hours = Array.from({ length: 12 }, (_, i) => (i + 1));
const minutes = Array.from({ length: 60 }, (_, i) => i);
const meridiems: Meridiem[] = ["AM", "PM"];

export const TimePicker = ({ value, onChange, disabled, placeholder = "Select time", ...a11y }: TimePickerProps) => {
  const initial = useMemo<TimeParts>(() => getPartsFrom24h(value), [value]);
  const [parts, setParts] = useState<TimeParts>(initial);
  const [open, setOpen] = useState(false);

  const handleCommit = () => {
    const safe: TimeParts = {
      hour12: clampNumber(parts.hour12, 1, 12),
      minute: clampNumber(parts.minute, 0, 59),
      meridiem: parts.meridiem,
    };
    const next = partsTo24h(safe);
    onChange?.(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) setParts(getPartsFrom24h(value)); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-between", disabled && "opacity-60")}
          disabled={disabled}
          aria-label={a11y["aria-label"] ?? "Open time picker"}
        >
          <span className="truncate">{value ? format12h(value) : placeholder}</span>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-3">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Select value={String(parts.hour12)} onValueChange={(v) => setParts((p) => ({ ...p, hour12: parseInt(v, 10) }))}>
              <SelectTrigger aria-label="Hours"><SelectValue placeholder="HH" /></SelectTrigger>
              <SelectContent>
                {hours.map((h) => (
                  <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={String(parts.minute)} onValueChange={(v) => setParts((p) => ({ ...p, minute: parseInt(v, 10) }))}>
              <SelectTrigger aria-label="Minutes"><SelectValue placeholder="MM" /></SelectTrigger>
              <SelectContent>
                {minutes.map((m) => (
                  <SelectItem key={m} value={String(m)}>{String(m).padStart(2, "0")}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={parts.meridiem} onValueChange={(v) => setParts((p) => ({ ...p, meridiem: v as Meridiem }))}>
              <SelectTrigger aria-label="AM or PM"><SelectValue placeholder="AM/PM" /></SelectTrigger>
              <SelectContent>
                {meridiems.map((mer) => (
                  <SelectItem key={mer} value={mer}>{mer}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setParts(getPartsFrom24h(value)); setOpen(false); }}>Cancel</Button>
            <Button size="sm" onClick={handleCommit}>OK</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TimePicker;


