import { Card } from "@heroui/react";
import { Clock, FileAudio, Hash, Music, Volume2, Waves } from "lucide-react";
import type { StreamInfo } from "../lib/types";
import { formatBytes, formatDuration } from "../lib/file-utils";

interface FileInfoProps {
  filename: string;
  fileSize: number;
  streamInfo: StreamInfo;
}

export function FileInfo({ filename, fileSize, streamInfo }: FileInfoProps) {
  const duration = streamInfo.sampleRate > 0 ? streamInfo.totalSamples / streamInfo.sampleRate : 0;

  const items = [
    { icon: Clock, label: "Duration", value: formatDuration(duration) },
    { icon: Waves, label: "Sample rate", value: `${(streamInfo.sampleRate / 1000).toFixed(1)} kHz` },
    { icon: Hash, label: "Bit depth", value: `${streamInfo.bitsPerSample}-bit` },
    {
      icon: Volume2,
      label: "Channels",
      value: streamInfo.channels === 2 ? "Stereo" : `${streamInfo.channels} ch`,
    },
    { icon: Music, label: "File size", value: formatBytes(fileSize) },
  ];

  return (
    <Card>
      <Card.Content className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <FileAudio className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground" title={filename}>
              {filename}
            </p>
            <p className="text-xs text-muted">FLAC audio file</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-md bg-surface-secondary/60 px-3 py-2"
              >
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Icon className="h-3 w-3" />
                  {item.label}
                </div>
                <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                  {item.value}
                </div>
              </div>
            );
          })}
        </div>
      </Card.Content>
    </Card>
  );
}
