"use client";

import { useEffect, useState } from "react";
import { fill } from "@/lib/messages";
import { postJson, useApi } from "@/lib/use-api";
import { useI18n } from "./locale";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { TimeZonePicker } from "./timezone-picker";

interface SettingsPayload {
  timeZone: string;
  importTimeZone: string;
  multipliers: Record<string, number>;
}

export function TimeZoneSettings() {
  const { text } = useI18n();
  const { data, error, refresh } = useApi<SettingsPayload>("/api/settings");
  const [timeZone, setTimeZone] = useState("");
  const [importTimeZone, setImportTimeZone] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState("");

  useEffect(() => {
    if (data) {
      setTimeZone(data.timeZone);
      setImportTimeZone(data.importTimeZone);
    }
  }, [data]);

  const save = async () => {
    setBusy(true);
    setSaved(false);
    setFailure("");
    try {
      await postJson("/api/settings", { timeZone, importTimeZone }, "PATCH");
      setSaved(true);
      refresh();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : text.settings.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{text.settings.timezonesTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset disabled={busy || !data} className="space-y-4">
          <div>
            <Label htmlFor="display-timezone" className="mb-1 block text-xs text-muted-foreground">
              {text.settings.displayTimezone}
            </Label>
            <TimeZonePicker
              id="display-timezone"
              label={text.settings.displayTimezoneLabel}
              value={timeZone}
              onValueChange={(value) => {
                setTimeZone(value);
                setSaved(false);
              }}
              disabled={busy || !data}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {text.settings.displayTimezoneHelp}
            </p>
            <button
              className="mt-1 text-xs text-muted-foreground underline"
              onClick={() => {
                setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
                setSaved(false);
              }}
            >
              {fill(text.settings.useDeviceTimezone, {
                zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              })}
            </button>
          </div>
          <div>
            <Label htmlFor="import-timezone" className="mb-1 block text-xs text-muted-foreground">
              {text.settings.importTimezone}
            </Label>
            <TimeZonePicker
              id="import-timezone"
              label={text.settings.importTimezoneLabel}
              value={importTimeZone}
              onValueChange={(value) => {
                setImportTimeZone(value);
                setSaved(false);
              }}
              disabled={busy || !data}
            />
            <p className="mt-1 text-xs text-muted-foreground">{text.settings.importTimezoneHelp}</p>
          </div>
          <Button onClick={save}>
            {busy ? text.settings.savingTimezones : text.settings.saveTimezones}
          </Button>
        </fieldset>
        {(failure || error) && (
          <p role="alert" className="text-sm text-destructive">
            {failure || error}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-muted-foreground">
            {text.settings.timezonesSaved}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ContractMultiplierSettings() {
  const { data, error, refresh } = useApi<SettingsPayload>("/api/settings");
  const [multipliers, setMultipliers] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState("");

  useEffect(() => {
    if (data)
      setMultipliers(
        Object.entries(data.multipliers)
          .map(([symbol, multiplier]) => `${symbol}=${multiplier}`)
          .join("\n"),
      );
  }, [data]);

  const save = async () => {
    setSaved(false);
    setFailure("");
    const parsed: Record<string, number> = {};
    for (const [index, line] of multipliers.split("\n").entries()) {
      if (!line.trim()) continue;
      const [symbol, value, extra] = line.split("=").map((part) => part.trim());
      if (
        !symbol ||
        !value ||
        extra !== undefined ||
        !Number.isFinite(Number(value)) ||
        Number(value) <= 0 ||
        Object.hasOwn(parsed, symbol.toUpperCase())
      ) {
        setFailure(
          `Check line ${index + 1}: enter a unique symbol and a positive multiplier, such as ESU6=50.`,
        );
        return;
      }
      parsed[symbol.toUpperCase()] = Number(value);
    }
    setBusy(true);
    try {
      await postJson("/api/settings", { multipliers: parsed }, "PATCH");
      setSaved(true);
      refresh();
    } catch (cause) {
      setFailure(cause instanceof Error ? cause.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card id="contract-multipliers" className="scroll-mt-20">
      <CardHeader>
        <CardTitle>Contract multipliers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <fieldset disabled={busy || !data} className="space-y-4">
          <div>
            <Label
              htmlFor="contract-multiplier-values"
              className="mb-1 block text-xs text-muted-foreground"
            >
              Futures/options — one per line, SYMBOL=multiplier
            </Label>
            <textarea
              id="contract-multiplier-values"
              value={multipliers}
              onChange={(event) => {
                setMultipliers(event.target.value);
                setSaved(false);
              }}
              placeholder={"ESU6=50\nNQU6=20\nMESU6=5"}
              className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Use the exact symbol shown on your imported trades, including the contract month when
              present.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Saving multipliers recalculates existing trade P&L from fills and preserves annotations.
          </p>
          <Button onClick={save}>{busy ? "Saving…" : "Save multipliers"}</Button>
        </fieldset>
        {(failure || error) && (
          <p role="alert" className="text-sm text-destructive">
            {failure || error}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-muted-foreground">
            Contract multipliers saved.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
