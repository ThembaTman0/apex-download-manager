import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import * as ContextMenu from "@radix-ui/react-context-menu";
import {
  CalendarClock,
  ChevronUp,
  ChevronDown,
  Copy,
  ExternalLink,
  FileDown,
  FileVideo,
  FileArchive,
  FileImage,
  File,
  FolderOpen,
  Info,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes, formatSpeed, formatETA } from "@/lib/utils";
import { useDownloadsStore, useFilteredDownloads } from "@/stores/downloadsStore";
import { StatusBadge } from "./StatusBadge";
import { ProgressCell } from "./ProgressCell";
import type { Download } from "@/types";

const helper = createColumnHelper<Download>();

const typeIcon = (type: string) => {
  const t = type.toUpperCase();
  const cls = "w-4 h-4 text-ink-muted";
  if (["MKV", "MP4", "AVI", "MOV", "WEBM"].includes(t)) return <FileVideo className={cls} />;
  if (["ZIP", "RAR", "7Z", "TAR", "GZ"].includes(t)) return <FileArchive className={cls} />;
  if (["PNG", "JPG", "JPEG", "GIF", "WEBP"].includes(t)) return <FileImage className={cls} />;
  if (["ISO", "EXE", "MSI", "DMG"].includes(t)) return <FileDown className={cls} />;
  return <File className={cls} />;
};

const ROW_HEIGHT = 37;

export function DownloadsTable() {
  const filtered = useFilteredDownloads();
  const { selectedIds, toggleSelect, selectAll, clearSelection } = useDownloadsStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Anchor of the last keyboard move, so ↑/↓ continue from where the user was.
  const keyboardAnchor = useRef<string | null>(null);

  const allSelected = filtered.length > 0 && filtered.every((d) => selectedIds.has(d.id));

  const columns = useMemo(
    () => [
      helper.display({
        id: "select",
        size: 40,
        header: () => (
          <input
            type="checkbox"
            checked={allSelected}
            onChange={allSelected ? clearSelection : selectAll}
            aria-label={allSelected ? "Deselect all downloads" : "Select all downloads"}
            className="accent-accent cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => toggleSelect(row.original.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${row.original.name}`}
            className="accent-accent cursor-pointer"
          />
        ),
      }),
      helper.display({
        id: "icon",
        size: 36,
        header: () => null,
        cell: ({ row }) => typeIcon(row.original.type),
      }),
      helper.accessor("name", {
        header: "Name",
        size: 280,
        cell: (info) => (
          <span className="flex items-center gap-1.5 max-w-[260px]">
            {info.row.original.url.startsWith("http://") && (
              <ShieldAlert
                className="w-3.5 h-3.5 text-warning/80 shrink-0"
                aria-label="Insecure connection (HTTP)"
              />
            )}
            <span
              className="text-sm text-ink font-medium truncate"
              title={info.row.original.error ?? info.getValue()}
            >
              {info.getValue()}
            </span>
          </span>
        ),
      }),
      helper.accessor("type", {
        header: "Type",
        size: 60,
        cell: (info) => (
          <span className="text-xs text-ink-muted font-mono">{info.getValue()}</span>
        ),
      }),
      helper.accessor("sizeBytes", {
        header: "Size",
        size: 80,
        cell: (info) => (
          <span className="text-xs text-ink-muted tabular-nums">
            {info.getValue() > 0 ? formatBytes(info.getValue()) : "-"}
          </span>
        ),
      }),
      helper.display({
        id: "progress",
        header: "Progress",
        size: 160,
        cell: ({ row }) => (
          <ProgressCell
            progress={row.original.progress}
            status={row.original.status}
            segments={row.original.segmentStates}
          />
        ),
      }),
      helper.accessor("speedBytesPerSec", {
        header: "Speed",
        size: 90,
        cell: (info) => (
          <span className="text-xs tabular-nums text-info">
            {info.getValue() > 0 ? formatSpeed(info.getValue()) : "-"}
          </span>
        ),
      }),
      helper.accessor("etaSeconds", {
        header: "ETA",
        size: 70,
        cell: (info) => (
          <span className="text-xs tabular-nums text-ink-muted">{formatETA(info.getValue())}</span>
        ),
      }),
      helper.accessor("status", {
        header: "Status",
        size: 110,
        cell: (info) => {
          const d = info.row.original;
          if (d.status === "queued" && d.startAt && d.startAt > Date.now()) {
            return (
              <span
                className="inline-flex items-center gap-1.5 text-[11px] text-ink-mid"
                title={new Date(d.startAt).toLocaleString()}
              >
                <CalendarClock className="w-3 h-3 text-ink-muted" />
                Scheduled
              </span>
            );
          }
          return <StatusBadge status={info.getValue()} />;
        },
      }),
      helper.accessor("modifiedAt", {
        header: "Modified",
        size: 90,
        cell: (info) => (
          <span className="text-xs tabular-nums text-ink-muted">
            {info.getValue().toLocaleDateString()}
          </span>
        ),
      }),
    ],
    [allSelected, selectedIds, toggleSelect, selectAll, clearSelection]
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;

  // Rows are windowed so a multi-thousand-item history stays smooth.
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    // The scroller mounts inside an animated page transition and the
    // ResizeObserver's first callback can lag, which would flash an empty
    // table. A generous assumed rect makes the first paint render rows;
    // the observer corrects the window once it fires.
    initialRect: { width: 1200, height: 900 },
  });

  // React 19 + StrictMode can swallow the rerender triggered by the
  // virtualizer's first ResizeObserver callback, leaving the tbody empty
  // until the next unrelated state change. Nudge one repaint after the
  // observer has settled; harmless when everything already rendered.
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    virtualizer.measure();
    const raf = requestAnimationFrame(() => forceRender());
    const t = setTimeout(forceRender, 150);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [virtualizer]);

  // ↑/↓ move the selection through the visible (sorted + filtered) order;
  // Shift extends, Home/End jump. Complements the global shortcuts in App.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement ||
        t.isContentEditable
      ) {
        return;
      }
      const s = useDownloadsStore.getState();
      if (
        s.addDialogOpen ||
        s.videoDialogOpen ||
        s.deleteDialogOpen ||
        s.checksumTarget ||
        s.scheduleTarget
      ) {
        return;
      }
      const order = rows.map((r) => r.original.id);
      if (order.length === 0) return;
      e.preventDefault();

      const anchorId =
        keyboardAnchor.current && s.selectedIds.has(keyboardAnchor.current)
          ? keyboardAnchor.current
          : order.find((id) => s.selectedIds.has(id)) ?? null;
      const anchorIdx = anchorId ? order.indexOf(anchorId) : -1;

      let nextIdx: number;
      if (e.key === "Home") nextIdx = 0;
      else if (e.key === "End") nextIdx = order.length - 1;
      else if (anchorIdx === -1) nextIdx = e.key === "ArrowDown" ? 0 : order.length - 1;
      else if (e.key === "ArrowDown") nextIdx = Math.min(order.length - 1, anchorIdx + 1);
      else nextIdx = Math.max(0, anchorIdx - 1);

      const nextId = order[nextIdx];
      keyboardAnchor.current = nextId;
      if (e.shiftKey && anchorIdx !== -1) {
        if (!s.selectedIds.has(nextId)) s.toggleSelect(nextId);
      } else {
        s.selectOnly(nextId);
      }
      if (s.detailsId) s.setDetailsId(nextId);
      virtualizer.scrollToIndex(nextIdx, { align: "auto" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, virtualizer]);

  const virtualRows = virtualizer.getVirtualItems();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? virtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
      : 0;

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto">
      <table className="w-full border-collapse table-fixed">
        <thead className="sticky top-0 z-10">
          <tr className="bg-surface/95 backdrop-blur-sm border-b border-white/[0.06]">
            {table.getFlatHeaders().map((header) => (
              <th
                key={header.id}
                scope="col"
                style={{ width: header.getSize() }}
                aria-sort={
                  header.column.getIsSorted() === "asc"
                    ? "ascending"
                    : header.column.getIsSorted() === "desc"
                      ? "descending"
                      : undefined
                }
                className="px-3 py-2 text-left text-[11px] font-medium text-ink-muted whitespace-nowrap"
              >
                {header.column.getCanSort() ? (
                  <button
                    onClick={header.column.getToggleSortingHandler()}
                    className="flex items-center gap-1 hover:text-ink transition-colors"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === "asc" ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : header.column.getIsSorted() === "desc" ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : null}
                  </button>
                ) : (
                  flexRender(header.column.columnDef.header, header.getContext())
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr aria-hidden="true">
              <td style={{ height: paddingTop, padding: 0 }} colSpan={columns.length} />
            </tr>
          )}
          {virtualRows.map((vRow) => {
            const row = rows[vRow.index];
            return (
              <TableRow
                key={row.original.id}
                row={row}
                selected={selectedIds.has(row.original.id)}
                measureRef={virtualizer.measureElement}
                index={vRow.index}
              />
            );
          })}
          {paddingBottom > 0 && (
            <tr aria-hidden="true">
              <td style={{ height: paddingBottom, padding: 0 }} colSpan={columns.length} />
            </tr>
          )}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-ink-muted">
          <FileDown className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm font-medium">No downloads yet</p>
          <p className="text-xs text-ink-faint mt-1">Click “Add URL” to start one</p>
        </div>
      )}
    </div>
  );
}

interface RowProps {
  row: { original: Download; getVisibleCells: () => any[] };
  selected: boolean;
  measureRef: (el: HTMLTableRowElement | null) => void;
  index: number;
}

function TableRow({ row, selected, measureRef, index }: RowProps) {
  const d = row.original;
  const {
    toggleSelect,
    pauseDownload,
    resumeDownload,
    restartDownload,
    openFile,
    showInFolder,
    copyUrls,
    removeDownloads,
    setChecksumTarget,
    setScheduleTarget,
    setDetailsId,
  } = useDownloadsStore();

  const canPause = d.status === "downloading" || d.status === "queued";
  const canResume = d.status === "paused" || d.status === "failed";
  const canSchedule = d.status !== "completed" && d.status !== "merging";

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <tr
          ref={measureRef}
          data-index={index}
          aria-selected={selected}
          onClick={() => toggleSelect(d.id)}
          onDoubleClick={() => {
            if (d.status === "completed") openFile(d.id);
            else setDetailsId(d.id);
          }}
          className={cn(
            "border-b border-white/[0.04] cursor-pointer transition-colors group",
            selected ? "bg-white/[0.05]" : "hover:bg-white/[0.025]"
          )}
        >
          {row.getVisibleCells().map((cell: any) => (
            <td
              key={cell.id}
              style={{ width: cell.column.getSize() }}
              className="px-3 py-2 overflow-hidden"
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
        </tr>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="z-50 min-w-[190px] rounded-xl bg-raised border border-white/[0.08] shadow-2xl shadow-black/50 p-1.5 text-sm">
          <MenuItem
            icon={ExternalLink}
            label="Open"
            disabled={d.status !== "completed"}
            onSelect={() => openFile(d.id)}
          />
          <MenuItem
            icon={FolderOpen}
            label="Show in Folder"
            onSelect={() => showInFolder(d.id)}
          />
          <MenuItem icon={Copy} label="Copy URL" onSelect={() => copyUrls([d.id])} />
          <MenuItem icon={Info} label="Properties" onSelect={() => setDetailsId(d.id)} />
          {d.status === "completed" && (
            <MenuItem
              icon={ShieldCheck}
              label="Verify Checksum…"
              onSelect={() => setChecksumTarget(d)}
            />
          )}
          <Separator />
          {canSchedule && (
            <MenuItem
              icon={CalendarClock}
              label="Schedule…"
              onSelect={() => setScheduleTarget(d)}
            />
          )}
          {canPause && (
            <MenuItem icon={Pause} label="Pause" onSelect={() => pauseDownload(d.id)} />
          )}
          {canResume && (
            <MenuItem icon={Play} label="Resume" onSelect={() => resumeDownload(d.id)} />
          )}
          <MenuItem
            icon={RotateCcw}
            label="Restart"
            onSelect={() => restartDownload(d.id)}
          />
          <Separator />
          <MenuItem
            icon={Trash2}
            label="Remove"
            danger
            onSelect={() => removeDownloads([d.id], false)}
          />
          <MenuItem
            icon={Trash2}
            label="Remove + Delete File"
            danger
            onSelect={() => removeDownloads([d.id], true)}
          />
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

function Separator() {
  return <ContextMenu.Separator className="h-px bg-white/[0.06] my-1" />;
}

function MenuItem({
  icon: Icon,
  label,
  danger,
  disabled,
  onSelect,
}: {
  icon: React.ElementType;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <ContextMenu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg outline-none cursor-pointer transition-colors",
        disabled
          ? "opacity-30 cursor-not-allowed"
          : danger
          ? "text-error-soft data-[highlighted]:bg-error/10"
          : "text-ink-mid data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-ink"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </ContextMenu.Item>
  );
}
