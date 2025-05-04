
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BotStatus, BotSettings, TradeHistory, BotStats } from '@/lib/types';
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

  // Save settings
  const saveSettings = async (updatedSettings: Partial<BotSettings>) => {
    try {
      if (!settings?.id) {
        // Create new settings if they don't exist
        const { data, error } = await supabase
          .from('bot_settings')
          .insert(updatedSettings)
          .select()
          .single();
          
        if (error) throw error;
        setSettings(data);
      } else {
        // Update existing settings
        const { data, error } = await supabase
          .from('bot_settings')
          .update(updatedSettings)
          .eq('id', settings.id)
          .select()
          .single();
          
        if (error) throw error;
        setSettings(data);
      }
      
      toast({
        title: "Settings saved",
        description: "Bot settings have been updated successfully.",
      });
      
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        variant: "destructive",
        title: "Failed to save settings",
        description: "There was an error saving the bot settings.",
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
    saveSettings,
    fetchBotStatus,
    fetchSettings,
    fetchTradeHistory,
    fetchStats
  };
}
