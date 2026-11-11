import { useEffect, useRef } from "react";
import "./wheel-picker.css";

const row = 40;
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
/** Studio hours for Joey consultations: 8:00am–3:00pm, half-hour steps. */
const hours = Array.from({ length: 8 }, (_, index) => String(index + 8).padStart(2, "0"));
const minutes = ["00", "30"];

export function accraToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Accra",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftDay(day: string, count: number) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + count)).toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const yearSpan = 10;

function accraClock() {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  const [hour, minute] = formatted.split(":").map(Number);
  return { hour: hour % 24, minute };
}

function clampDate(year: string, month: string, date: string) {
  const today = accraToday();
  const start = Number(today.slice(0, 4));
  let yearNum = Number(year);
  if (yearNum < start) yearNum = start;
  if (yearNum >= start + yearSpan) yearNum = start + yearSpan - 1;
  const nextYear = String(yearNum);
  let monthNum = Number(month);
  const minMonth = nextYear === today.slice(0, 4) ? Number(today.slice(5, 7)) : 1;
  if (monthNum < minMonth) monthNum = minMonth;
  if (monthNum > 12) monthNum = 12;
  const nextMonth = String(monthNum).padStart(2, "0");
  const max = daysInMonth(yearNum, monthNum);
  let dayNum = Math.min(Number(date) || 1, max);
  const minDay =
    nextYear === today.slice(0, 4) && nextMonth === today.slice(5, 7)
      ? Number(today.slice(8, 10))
      : 1;
  if (dayNum < minDay) dayNum = minDay;
  return {
    year: nextYear,
    month: nextMonth,
    date: String(dayNum).padStart(2, "0"),
  };
}

function studioTimes(day: string) {
  const slots = hours.flatMap((hour) =>
    minutes
      .filter((minute) => !(hour === "15" && minute === "30"))
      .map((minute) => ({ hour, minute })),
  );
  const today = accraToday();
  if (day > today) return slots;
  if (day < today) return [];
  const clock = accraClock();
  const cutoff = clock.hour * 60 + clock.minute + 30;
  return slots.filter((slot) => Number(slot.hour) * 60 + Number(slot.minute) >= cutoff);
}

function nearestTime(day: string, hour: string, minute: string) {
  const slots = studioTimes(day);
  if (!slots.length) return { hour, minute };
  return (
    slots.find((slot) => slot.hour === hour && slot.minute === minute) ||
    slots.find((slot) => slot.hour === hour) ||
    slots[0]
  );
}

function parts(value: string, withTime: boolean) {
  const fallback = `${shiftDay(accraToday(), 1)}${withTime ? "T10:00" : ""}`;
  const source = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(value) ? value : fallback;
  const year = Number(source.slice(0, 4));
  const month = Number(source.slice(5, 7));
  const date = Number(source.slice(8, 10));
  const hour = withTime ? source.slice(11, 13) || "10" : "";
  const minute = withTime ? source.slice(14, 16) || "00" : "";
  const max = daysInMonth(year, month);
  return {
    year: String(year),
    month: String(month).padStart(2, "0"),
    date: String(Math.min(date, max)).padStart(2, "0"),
    hour: hours.includes(hour) ? hour : "10",
    minute: minutes.includes(minute) ? minute : "00",
  };
}

export function formatWheelValue(value: string, withTime = false) {
  const chosen = parts(value, withTime);
  const date = new Date(
    Date.UTC(
      Number(chosen.year),
      Number(chosen.month) - 1,
      Number(chosen.date),
      withTime ? Number(chosen.hour) : 12,
      withTime ? Number(chosen.minute) : 0,
    ),
  );
  return new Intl.DateTimeFormat("en-GH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
    timeZone: "UTC",
  }).format(date);
}

function WheelColumn({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const frame = useRef(0);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const index = Math.max(0, options.findIndex((option) => option.value === value));
    const top = index * row;
    if (Math.abs(element.scrollTop - top) <= 1) return;
    element.scrollTo({ top });
  }, [options, value]);

  function settle() {
    const element = scroller.current;
    if (!element) return;
    const index = Math.min(
      options.length - 1,
      Math.max(0, Math.round(element.scrollTop / row)),
    );
    const next = options[index]?.value;
    element.scrollTo({ top: index * row });
    if (next && next !== value) onChange(next);
  }

  return (
    <div className="wheel-col">
      <div
        ref={scroller}
        className="wheel-col-scroll"
        role="listbox"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(event) => {
          const index = options.findIndex((option) => option.value === value);
          if (event.key === "ArrowDown") {
            event.preventDefault();
            onChange(options[Math.min(options.length - 1, index + 1)]?.value || value);
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            onChange(options[Math.max(0, index - 1)]?.value || value);
          }
        }}
        onScroll={() => {
          window.clearTimeout(timer.current);
          window.cancelAnimationFrame(frame.current);
          timer.current = window.setTimeout(() => {
            frame.current = window.requestAnimationFrame(settle);
          }, 90);
        }}
      >
        <div className="wheel-pad" />
        <div className="wheel-pad" />
        {options.map((option) => (
          <div
            key={option.value}
            role="option"
            aria-selected={option.value === value}
            className={`wheel-option${option.value === value ? " is-selected" : ""}`}
          >
            {option.label}
          </div>
        ))}
        <div className="wheel-pad" />
        <div className="wheel-pad" />
      </div>
    </div>
  );
}

export function WheelDatePicker({
  value,
  onChange,
  withTime = false,
  timeOnly = false,
}: {
  value: string;
  onChange: (value: string) => void;
  withTime?: boolean;
  timeOnly?: boolean;
}) {
  const timed = withTime || timeOnly;
  const chosen = parts(value, timed);
  const today = accraToday();
  const startYear = Number(today.slice(0, 4));
  const years = Array.from({ length: yearSpan }, (_, index) => String(startYear + index));
  const picked = timeOnly ? chosen : { ...chosen, ...clampDate(chosen.year, chosen.month, chosen.date) };
  const day = timeOnly ? value.slice(0, 10) : `${picked.year}-${picked.month}-${picked.date}`;
  const slot = timed ? nearestTime(day, picked.hour, picked.minute) : { hour: picked.hour, minute: picked.minute };
  const monthStart = Number(picked.year) === startYear ? Number(today.slice(5, 7)) : 1;
  const monthOptions = months
    .map((label, index) => ({ value: String(index + 1).padStart(2, "0"), label }))
    .filter((option) => Number(option.value) >= monthStart);
  const dayCount = daysInMonth(Number(picked.year), Number(picked.month));
  const dayStart =
    picked.year === today.slice(0, 4) && picked.month === today.slice(5, 7)
      ? Number(today.slice(8, 10))
      : 1;
  const dates = Array.from({ length: dayCount - dayStart + 1 }, (_, index) =>
    String(dayStart + index).padStart(2, "0"),
  );
  const slots = timed ? studioTimes(day) : [];
  const hourOptions = [...new Set(slots.map((item) => item.hour))].map((hour) => ({
    value: hour,
    label: String(Number(hour)),
  }));
  const minuteOptions = slots
    .filter((item) => item.hour === slot.hour)
    .map((item) => ({ value: item.minute, label: item.minute }));

  useEffect(() => {
    const next = timed ? `${day}T${slot.hour}:${slot.minute}` : day;
    if (next !== value) onChange(next);
  }, [day, onChange, slot.hour, slot.minute, timed, value]);

  function emit(next: Partial<typeof chosen>) {
    const merged = { ...picked, ...next };
    if (timeOnly) {
      const time = nearestTime(value.slice(0, 10), merged.hour, merged.minute);
      onChange(`${value.slice(0, 10)}T${time.hour}:${time.minute}`);
      return;
    }
    const date = clampDate(merged.year, merged.month, merged.date);
    const nextDay = `${date.year}-${date.month}-${date.date}`;
    if (!timed) {
      onChange(nextDay);
      return;
    }
    const time = nearestTime(nextDay, merged.hour, merged.minute);
    onChange(`${nextDay}T${time.hour}:${time.minute}`);
  }

  return (
    <div className="wheel-picker">
      <div className="wheel-captions" aria-hidden="true">
        {timeOnly ? (
          <>
            <span>Hour</span>
            <span>Minute</span>
          </>
        ) : (
          <>
            <span>Month</span>
            <span>Day</span>
            <span>Year</span>
            {timed && (
              <>
                <span>Hour</span>
                <span>Minute</span>
              </>
            )}
          </>
        )}
      </div>
      <div className="wheel">
        {!timeOnly && (
          <>
            <WheelColumn
              label="Month"
              value={picked.month}
              onChange={(month) => emit({ month })}
              options={monthOptions}
            />
            <WheelColumn
              label="Day"
              value={picked.date}
              onChange={(date) => emit({ date })}
              options={dates.map((date) => ({ value: date, label: String(Number(date)) }))}
            />
            <WheelColumn
              label="Year"
              value={years.includes(picked.year) ? picked.year : years[0]}
              onChange={(year) => emit({ year })}
              options={years.map((year) => ({ value: year, label: year }))}
            />
          </>
        )}
        {timed && slots.length > 0 && (
          <>
            <WheelColumn
              label="Hour"
              value={slot.hour}
              onChange={(hour) => emit({ hour })}
              options={hourOptions}
            />
            <WheelColumn
              label="Minute"
              value={slot.minute}
              onChange={(minute) => emit({ minute })}
              options={minuteOptions}
            />
          </>
        )}
        <div className="wheel-shade" />
      </div>
      <p className="wheel-readout">
        {timed && slots.length === 0
          ? "This day has passed."
          : formatWheelValue(timed ? `${day}T${slot.hour}:${slot.minute}` : day, timed)}
      </p>
    </div>
  );
}
