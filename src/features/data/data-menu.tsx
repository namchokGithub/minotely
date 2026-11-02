import { useRef, useState } from "react";
import { Download, Settings2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageDialog, type Message } from "@/components/message-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUid } from "@/features/auth/auth-context";
import { exportBackup, importBackup, parseBackup } from "./backup";
import { downloadFile } from "./download";

/** Library-wide JSON backup: export everything, import as new books and notes. */
export function DataMenu() {
  const uid = useUid();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const handleExport = async () => {
    setBusy(true);
    try {
      const backup = await exportBackup(uid);
      const date = backup.exportedAt.slice(0, 10);
      downloadFile(
        `minotely-backup-${date}.json`,
        JSON.stringify(backup, null, 2),
        "application/json",
      );
    } catch (error) {
      console.error("Export failed", error);
      setMessage({ title: "Export failed", body: "Please try again." });
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (file: File) => {
    setBusy(true);
    try {
      const result = await importBackup(uid, parseBackup(await file.text()));
      setMessage({
        title: "Import complete",
        body: `Added ${result.books} book(s) and ${result.notes} note(s).`,
      });
    } catch (error) {
      console.error("Import failed", error);
      setMessage({
        title: "Import failed",
        body: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Import and export"
            title="Import and export"
            disabled={busy}
          >
            <Settings2 />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-auto min-w-44">
          <DropdownMenuLabel>Backup (JSON)</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => void handleExport()}>
            <Download /> Export all
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
            <Upload /> Import…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void handleImport(file);
        }}
      />

      <MessageDialog message={message} onClose={() => setMessage(null)} />
    </>
  );
}
