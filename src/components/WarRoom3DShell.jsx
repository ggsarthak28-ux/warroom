import { TradingFloor3D } from "./TradingFloor3D";

export function WarRoom3DShell({
  indices,
  marketStatus,
  selected,
  selectedHistory,
  dataStatus,
  shockwaveEventId,
  focusEventId,
  page
}) {
  return (
    <TradingFloor3D
      indices={indices}
      marketStatus={marketStatus}
      selected={selected}
      selectedHistory={selectedHistory}
      dataStatus={dataStatus}
      shockwaveEventId={shockwaveEventId + focusEventId}
      page={page}
    />
  );
}
