
export type BotStatus = 'idle' | 'running' | 'error' | 'starting' | 'stopping';

export interface BuyConditions {
  minimum_liquidity: number;
  slippage: number;
  allowed_dexes: string[];
  require_verified_contract: boolean;
  max_priority_fee: number;
  enable_antibot: boolean;
}

export interface SellConditions {
  target_profit: number;
  stop_loss: number;
  max_holding_time: number;
  sell_on_volatility_spike: boolean;
}

export interface RiskControl {
  position_size_percentage: number;
  max_open_trades: number;
  cooldown_period: number;
}

export interface BotSettings {
  id: string;
  rpc_url: string;
  wallet_address: string;
  telegram_enabled: boolean;
  telegram_token?: string;
  telegram_chat_id?: string;
  buy_conditions: BuyConditions;
  sell_conditions: SellConditions;
  risk_control: RiskControl;
  created_at: string;
  updated_at: string;
}

export interface TradeHistory {
  id: string;
  token_address: string;
  token_name: string;
  token_symbol: string;
  entry_price: number;
  exit_price?: number;
  amount_spent: number;
  amount_received?: number;
  profit_loss_pct?: number;
  tx_sig_buy: string;
  tx_sig_sell?: string;
  status: 'active' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface BotStats {
  id: string;
  tokens_found: number;
  trades_made: number;
  profit_loss: number;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      bot_settings: {
        Row: BotSettings;
        Insert: Omit<BotSettings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<BotSettings, 'id' | 'created_at' | 'updated_at'>>;
      };
      trade_history: {
        Row: TradeHistory;
        Insert: Omit<TradeHistory, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<TradeHistory, 'id' | 'created_at' | 'updated_at'>>;
      };
      bot_stats: {
        Row: BotStats;
        Insert: Omit<BotStats, 'id' | 'updated_at'>;
        Update: Partial<Omit<BotStats, 'id' | 'updated_at'>>;
      };
    };
  };
}
