
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BotStatus, 
  BotSettings, 
  TradeHistory, 
  BotStats, 
  BuyConditions,
  SellConditions,
  RiskControl
} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function useBot() {
  const { toast } = useToast();
  const [botStatus, setBotStatus] = useState<BotStatus>('idle');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [stats, setStats] = useState<BotStats | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchBotStatus();
    fetchSettings();
    fetchTradeHistory();
    fetchStats();

    // Subscribe to real-time updates
    const statusSubscription = supabase
      .channel('bot_status_changes')
      .on('broadcast', { event: 'bot_status' }, (payload) => {
        setBotStatus(payload.payload.status as BotStatus);
      })
      .subscribe();

    const tradesSubscription = supabase
      .channel('trades')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'trade_history' }, 
          () => {
            fetchTradeHistory();
            fetchStats();
          })
      .subscribe();

    return () => {
      statusSubscription.unsubscribe();
      tradesSubscription.unsubscribe();
    };
  }, []);

  // Fetch bot status
  const fetchBotStatus = async () => {
    try {
      const { data } = await supabase.functions.invoke('get-bot-status');
      setBotStatus(data?.status || 'idle');
    } catch (error) {
      console.error('Error fetching bot status:', error);
      setBotStatus('error');
    }
  };

  // Fetch settings
  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('bot_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  // Fetch trade history
  const fetchTradeHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('trade_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTradeHistory(data || []);
    } catch (error) {
      console.error('Error fetching trade history:', error);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('bot_stats')
        .select('*')
        .single();

      if (error) throw error;
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Start bot
  const startBot = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('start-bot');
      
      if (error) throw error;
      
      setBotStatus('running');
      toast({
        title: "Bot started",
        description: "Token sniping bot is now running and monitoring for new liquidity events.",
      });
    } catch (error) {
      console.error('Error starting bot:', error);
      setBotStatus('error');
      toast({
        variant: "destructive",
        title: "Failed to start bot",
        description: "There was an error starting the token sniping bot.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Stop bot
  const stopBot = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stop-bot');
      
      if (error) throw error;
      
      setBotStatus('idle');
      toast({
        title: "Bot stopped",
        description: "Token sniping bot has been stopped.",
      });
    } catch (error) {
      console.error('Error stopping bot:', error);
      toast({
        variant: "destructive",
        title: "Failed to stop bot",
        description: "There was an error stopping the token sniping bot.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Save buy conditions
  const saveBuyConditions = async (buyConditions: Partial<BuyConditions>) => {
    try {
      if (!settings?.id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No settings found to update.",
        });
        return false;
      }

      const { data, error } = await supabase
        .from('bot_settings')
        .update({
          buy_conditions: {
            ...settings.buy_conditions,
            ...buyConditions,
          }
        })
        .eq('id', settings.id)
        .select()
        .single();
        
      if (error) throw error;
      
      setSettings(data);
      toast({
        title: "Buy conditions updated",
        description: "Buy conditions have been updated successfully.",
      });
      
      return true;
    } catch (error) {
      console.error('Error saving buy conditions:', error);
      toast({
        variant: "destructive",
        title: "Failed to save buy conditions",
        description: "There was an error updating the buy conditions.",
      });
      return false;
    }
  };

  // Save sell conditions
  const saveSellConditions = async (sellConditions: Partial<SellConditions>) => {
    try {
      if (!settings?.id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No settings found to update.",
        });
        return false;
      }

      const { data, error } = await supabase
        .from('bot_settings')
        .update({
          sell_conditions: {
            ...settings.sell_conditions,
            ...sellConditions,
          }
        })
        .eq('id', settings.id)
        .select()
        .single();
        
      if (error) throw error;
      
      setSettings(data);
      toast({
        title: "Sell conditions updated",
        description: "Sell conditions have been updated successfully.",
      });
      
      return true;
    } catch (error) {
      console.error('Error saving sell conditions:', error);
      toast({
        variant: "destructive",
        title: "Failed to save sell conditions",
        description: "There was an error updating the sell conditions.",
      });
      return false;
    }
  };

  // Save risk control settings
  const saveRiskControl = async (riskControl: Partial<RiskControl>) => {
    try {
      if (!settings?.id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No settings found to update.",
        });
        return false;
      }

      const { data, error } = await supabase
        .from('bot_settings')
        .update({
          risk_control: {
            ...settings.risk_control,
            ...riskControl,
          }
        })
        .eq('id', settings.id)
        .select()
        .single();
        
      if (error) throw error;
      
      setSettings(data);
      toast({
        title: "Risk control updated",
        description: "Risk control settings have been updated successfully.",
      });
      
      return true;
    } catch (error) {
      console.error('Error saving risk control:', error);
      toast({
        variant: "destructive",
        title: "Failed to save risk control",
        description: "There was an error updating the risk control settings.",
      });
      return false;
    }
  };

  // Save general settings
  const saveGeneralSettings = async (generalSettings: {
    rpc_url?: string;
    wallet_address?: string;
    telegram_enabled?: boolean;
    telegram_token?: string;
    telegram_chat_id?: string;
  }) => {
    try {
      if (!settings?.id) {
        // Create new settings if they don't exist
        const defaultBuyConditions: BuyConditions = {
          minimum_liquidity: 1000.0,
          slippage: 1.0,
          allowed_dexes: ["jupiter", "raydium"],
          require_verified_contract: true,
          max_priority_fee: 0.000005,
          enable_antibot: true,
        };
        
        const defaultSellConditions: SellConditions = {
          target_profit: 20.0,
          stop_loss: 10.0,
          max_holding_time: 60,
          sell_on_volatility_spike: false,
        };
        
        const defaultRiskControl: RiskControl = {
          position_size_percentage: 5.0,
          max_open_trades: 3,
          cooldown_period: 30,
        };
        
        const { data, error } = await supabase
          .from('bot_settings')
          .insert({
            rpc_url: generalSettings.rpc_url || 'https://api.mainnet-beta.solana.com',
            wallet_address: generalSettings.wallet_address || '',
            telegram_enabled: generalSettings.telegram_enabled || false,
            telegram_token: generalSettings.telegram_token || '',
            telegram_chat_id: generalSettings.telegram_chat_id || '',
            buy_conditions: defaultBuyConditions,
            sell_conditions: defaultSellConditions,
            risk_control: defaultRiskControl,
          })
          .select()
          .single();
          
        if (error) throw error;
        setSettings(data);
      } else {
        // Update existing settings
        const { data, error } = await supabase
          .from('bot_settings')
          .update({
            ...generalSettings,
          })
          .eq('id', settings.id)
          .select()
          .single();
          
        if (error) throw error;
        setSettings(data);
      }
      
      toast({
        title: "Settings saved",
        description: "General settings have been updated successfully.",
      });
      
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: "destructive",
        title: "Failed to save settings",
        description: "There was an error saving the general settings.",
      });
      return false;
    }
  };

  return {
    botStatus,
    loading,
    settings,
    tradeHistory,
    stats,
    startBot,
    stopBot,
    saveBuyConditions,
    saveSellConditions,
    saveRiskControl,
    saveGeneralSettings,
    fetchBotStatus,
    fetchSettings,
    fetchTradeHistory,
    fetchStats
  };
}
