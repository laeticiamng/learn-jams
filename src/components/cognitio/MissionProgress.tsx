import { Progress } from "@/components/ui/progress";
import { getBrickLabel } from "@/lib/cognitio-ui";
import type { BrickType } from "@/domain/cognitio/types";

interface MissionProgressProps {
  currentRoomIndex: number;
  totalRooms: number;
  isBoss: boolean;
  progress: number;
  roomBricks?: BrickType[];
}

export default function MissionProgress({
  currentRoomIndex,
  totalRooms,
  isBoss,
  progress,
  roomBricks = [],
}: MissionProgressProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {isBoss ? "Boss Final" : `Salle ${currentRoomIndex + 1}/${totalRooms}`}
        </span>
        <span className="tabular-nums">{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
      {roomBricks.length > 0 && (
        <div className="flex gap-1">
          {roomBricks.map((brick, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-all ${
                i < currentRoomIndex
                  ? "bg-green-500"
                  : i === currentRoomIndex && !isBoss
                    ? "bg-primary"
                    : "bg-muted/30"
              }`}
              title={getBrickLabel(brick)}
            />
          ))}
          {totalRooms > roomBricks.length && (
            <div
              className={`flex-1 h-1.5 rounded-full ${isBoss ? "bg-primary" : "bg-muted/30"}`}
              title="Boss"
            />
          )}
        </div>
      )}
    </div>
  );
}
