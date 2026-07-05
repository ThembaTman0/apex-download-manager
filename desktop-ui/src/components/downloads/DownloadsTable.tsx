import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { motion, AnimatePresence } from "framer-motion";
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
  const cls = "w-4 h-4 text-[#8A9199]";
  if (["MKV", "MP4", "AVI", "MOV", "WEBM"].includes(t)) return <FileVideo className={cls} />;
  if (["ZIP", "RAR", "7Z", "TAR", "GZ"].includes(t)) return <FileArchive className={cls} />;
  if (["PNG", "JPG", "JPEG", "GIF", "WEBP"].includes(t)) return <FileImage className={cls} />;
  if (["ISO", "EXE", "MSI", "DMG"].includes(t)) return <FileDown className={cls} />;
  return <File className={cls} />;
};

export function DownloadsTable() {
  const filtered = useFilteredDownloads();
  const { selectedIds, toggleSelect, selectAll, clearSelection } = useDownloadsStore();
  const [sorting, setSorting] = useState<SortingState>([]);

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
            className="accent-[#E6B450] cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => toggleSelect(row.original.id)}
            onClick={(e) => e.stopPropagation()}
            className="accent-[#E6B450] cursor-pointer"
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
                className="w-3.5 h-3.5 text-[#FF8F40]/80 shrink-0"
                aria-label="Insecure connection (HTTP)"
              />
            )}
            <span
              className="text-sm text-[#E6E1CF] font-medium truncate"
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
          <span className="text-xs text-[#8A9199] font-mono">{info.getValue()}</span>
        ),
      }),
      helper.accessor("sizeBytes", {
        header: "Size",
        size: 80,
        cell: (info) => (
          <span className="text-xs text-[#8A9199] tabular-nums">
            {info.getValue() > 0 ? formatBytes(info.getValue()) : "—"}
          </span>
        ),
      }),
      helper.display({
        id: "progress",
        header: "Progress",
        size: 160,
        cell: ({ row }) => (
          <ProgressCell progress={row.original.progress} status={row.original.status} />
        ),
      }),
      helper.accessor("speedBytesPerSec", {
        header: "Speed",
        size: 90,
        cell: (info) => (
          <span className="text-xs tabular-nums text-[#39BAE6]">
            {info.getValue() > 0 ? formatSpeed(info.getValue()) : "—"}
          </span>
        ),
      }),
      helper.accessor("etaSeconds", {
        header: "ETA",
        size: 70,
        cell: (info) => (
          <span className="text-xs tabular-nums text-[#8A9199]">{formatETA(info.getValue())}</span>
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
                className="inline-flex items-center gap-1.5 text-[11px] text-[#BFBDB6]"
                title={new Date(d.startAt).toLocaleString()}
              >
                <CalendarClock className="w-3 h-3 text-[#8A9199]" />
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
          <span className="text-xs tabular-nums text-[#8A9199]">
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

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse table-fixed">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[#0D1017]/95 backdrop-blur-sm border-b border-white/[0.06]">
            {table.getFlatHeaders().map((header) => (
              <th
                key={header.id}
                style={{ width: header.getSize() }}
                className="px-3 py-2 text-left text-[11px] font-medium text-[#8A9199]/80 whitespace-nowrap"
              >
                {header.column.getCanSort() ? (
                  <button
                    onClick={header.column.getToggleSortingHandler()}
                    className="flex items-center gap-1 hover:text-[#E6E1CF] transition-colors"
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
          <AnimatePresence initial={false}>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.original.id}
                row={row}
                selected={selectedIds.has(row.original.id)}
              />
            ))}
          </AnimatePresence>
        </tbody>
      </table>
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-[#8A9199]">
          <FileDown className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm font-medium">No downloads yet</p>
          <p className="text-xs opacity-60 mt-1">Click “Add URL” to start one</p>
        </div>
      )}
    </div>
  );
}

interface RowProps {
  row: { original: Download; getVisibleCells: () => any[] };
  selected: boolean;
}

function TableRow({ row, selected }: RowProps) {
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
        <motion.tr
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={() => toggleSelect(d.id)}
          onDoubleClick={() => {
            if (d.status === "completed") openFile(d.id);
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
        </motion.tr>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="z-50 min-w-[190px] rounded-xl bg-[#161B24] border border-white/[0.08] shadow-2xl shadow-black/50 p-1.5 text-sm">
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
          ? "text-[#F07178] data-[highlighted]:bg-[#D95757]/10"
          : "text-[#BFBDB6] data-[highlighted]:bg-white/[0.06] data-[highlighted]:text-[#E6E1CF]"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </ContextMenu.Item>
  );
}
