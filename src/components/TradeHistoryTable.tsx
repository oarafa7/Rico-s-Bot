
import { TradeHistory } from "@/lib/types";

export function TradeHistoryTable({ trades }: { trades: TradeHistory[] }) {
  return (
    <div className="rounded-md border">
      <div className="grid grid-cols-5 gap-4 p-4 font-medium border-b">
        <div>Token</div>
        <div>Buy Price</div>
        <div>Sell Price</div>
        <div>Profit/Loss</div>
        <div>Status</div>
      </div>
      <div className="divide-y">
        {trades.map((trade) => (
          <div key={trade.id} className="grid grid-cols-5 gap-4 p-4">
            <div className="font-medium">{trade.token_name}</div>
            <div>{trade.entry_price.toFixed(4)} USDC</div>
            <div>{trade.exit_price ? `${trade.exit_price.toFixed(4)} USDC` : "-"}</div>
            <div className={trade.profit_loss_pct ? 
                (trade.profit_loss_pct > 0 ? "text-green-600" : "text-red-600") : ""}>
              {trade.profit_loss_pct ? `${trade.profit_loss_pct.toFixed(2)}%` : "-"}
            </div>
            <div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium 
                ${trade.status === 'active' ? 'bg-blue-100 text-blue-800' : 
                  trade.status === 'completed' ? 'bg-green-100 text-green-800' : 
                  'bg-red-100 text-red-800'}`}>
                {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
