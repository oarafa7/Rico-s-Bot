
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BadgeDollarSign, Bot, History, Settings, Activity } from "lucide-react";
import { useBot } from "@/hooks/use-bot";

// Define form schema
const settingsFormSchema = z.object({
  slippage: z.coerce.number().min(0.1).max(100),
  swap_amount: z.coerce.number().min(0.1),
  target_profit: z.coerce.number().min(1),
  stop_loss: z.coerce.number().min(1),
  rpc_url: z.string().url("Must be a valid URL"),
  wallet_address: z.string().min(32).max(44),
  telegram_enabled: z.boolean(),
  telegram_token: z.string().optional(),
  telegram_chat_id: z.string().optional(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

const Index = () => {
  const {
    botStatus,
    loading,
    settings,
    tradeHistory,
    stats,
    startBot,
    stopBot,
    saveSettings
  } = useBot();

  // Set up the form
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      slippage: 1.0,
      swap_amount: 10.0,
      target_profit: 20.0,
      stop_loss: 10.0,
      rpc_url: "https://api.mainnet-beta.solana.com",
      wallet_address: "",
      telegram_enabled: false,
      telegram_token: "",
      telegram_chat_id: "",
    },
  });

  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset({
        slippage: settings.slippage,
        swap_amount: settings.swap_amount,
        target_profit: settings.target_profit,
        stop_loss: settings.stop_loss,
        rpc_url: settings.rpc_url,
        wallet_address: settings.wallet_address,
        telegram_enabled: settings.telegram_enabled,
        telegram_token: settings.telegram_token || "",
        telegram_chat_id: settings.telegram_chat_id || "",
      });
    }
  }, [settings, form]);

  // Handle settings form submission
  const onSubmit = async (data: SettingsFormValues) => {
    await saveSettings(data);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Solana Token Sniping Bot</h1>
        <p className="text-muted-foreground">Monitor and automatically trade new Solana tokens.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bot Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  {botStatus === "running" ? "Active" : botStatus === "error" ? "Error" : "Inactive"}
                </span>
              </div>
              <div className={`h-3 w-3 rounded-full ${
                botStatus === "running" ? "bg-green-500" : 
                botStatus === "error" ? "bg-red-500" : "bg-yellow-500"
              }`}></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tokens Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats?.tokens_found || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Trades Made</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats?.trades_made || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Profit/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {stats ? `${stats.profit_loss.toFixed(2)} USDC` : "0.00 USDC"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="control" className="w-full">
        <TabsList>
          <TabsTrigger value="control">Control</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="control" className="space-y-4 mt-2">
          <Card>
            <CardHeader>
              <CardTitle>Bot Control</CardTitle>
              <CardDescription>Manage your token sniping bot operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-yellow-50">
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  Make sure your wallet has sufficient funds and your settings are configured before starting the bot.
                </AlertDescription>
              </Alert>
              <div className="flex gap-4 mt-4">
                {botStatus !== "running" ? (
                  <Button onClick={startBot} disabled={loading} className="w-full">
                    {loading ? "Starting..." : "Start Bot"}
                  </Button>
                ) : (
                  <Button onClick={stopBot} disabled={loading} variant="destructive" className="w-full">
                    {loading ? "Stopping..." : "Stop Bot"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-2">
          <Card>
            <CardHeader>
              <CardTitle>Bot Settings</CardTitle>
              <CardDescription>Configure your token sniping parameters</CardDescription>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="slippage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slippage (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" min="0.1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="swap_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Swap Amount (USDC)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="target_profit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Profit (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="stop_loss"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stop Loss (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="1" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="rpc_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RPC URL</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="wallet_address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wallet Address</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Your Solana wallet address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="telegram_enabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable Telegram Alerts</FormLabel>
                            <FormDescription>
                              Receive alerts via Telegram when the bot executes trades.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    {form.watch("telegram_enabled") && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="telegram_token"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telegram Bot Token</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} placeholder="Enter your Telegram bot token" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="telegram_chat_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telegram Chat ID</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Enter your Telegram chat ID" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving..." : "Save Settings"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-2">
          <Card>
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
              <CardDescription>Review your past token trades</CardDescription>
            </CardHeader>
            <CardContent>
              {tradeHistory.length > 0 ? (
                <div className="rounded-md border">
                  <div className="grid grid-cols-5 gap-4 p-4 font-medium border-b">
                    <div>Token</div>
                    <div>Buy Price</div>
                    <div>Sell Price</div>
                    <div>Profit/Loss</div>
                    <div>Status</div>
                  </div>
                  <div className="divide-y">
                    {tradeHistory.map((trade) => (
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
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  No trades have been executed yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
