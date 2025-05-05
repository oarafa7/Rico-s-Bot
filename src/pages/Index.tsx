
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BadgeDollarSign, Bot, History, Activity } from "lucide-react";
import { useBot } from "@/hooks/use-bot";

// Import our parameter forms
import { BuyConditionsForm } from "@/components/BuyConditionsForm";
import { SellConditionsForm } from "@/components/SellConditionsForm";
import { RiskControlForm } from "@/components/RiskControlForm";
import { GeneralSettingsForm } from "@/components/GeneralSettingsForm";
import { TradeHistoryTable } from "@/components/TradeHistoryTable";

const Index = () => {
  const {
    botStatus,
    loading,
    settings,
    tradeHistory,
    stats,
    startBot,
    stopBot,
  } = useBot();

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
                  {botStatus === "running" ? "Active" : 
                   botStatus === "error" ? "Error" : 
                   botStatus === "starting" ? "Starting" :
                   botStatus === "stopping" ? "Stopping" : "Inactive"}
                </span>
              </div>
              <div className={`h-3 w-3 rounded-full ${
                botStatus === "running" ? "bg-green-500" : 
                botStatus === "error" ? "bg-red-500" :
                botStatus === "starting" || botStatus === "stopping" ? "bg-amber-500" : "bg-yellow-500"
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
              <span className={`text-2xl font-bold ${stats && stats.profit_loss > 0 ? "text-green-600" : stats && stats.profit_loss < 0 ? "text-red-600" : ""}`}>
                {stats ? `${stats.profit_loss.toFixed(2)} USDC` : "0.00 USDC"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="control" className="w-full">
        <TabsList>
          <TabsTrigger value="control">Control</TabsTrigger>
          <TabsTrigger value="buy-conditions">Buy Conditions</TabsTrigger>
          <TabsTrigger value="sell-conditions">Sell Conditions</TabsTrigger>
          <TabsTrigger value="risk-control">Risk Control</TabsTrigger>
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
                {botStatus !== "running" && botStatus !== "starting" ? (
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

        <TabsContent value="buy-conditions" className="space-y-4 mt-2">
          {settings ? (
            <BuyConditionsForm buyConditions={settings.buy_conditions} />
          ) : (
            <Card>
              <CardContent className="py-4">
                <p className="text-center text-muted-foreground">Loading settings...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sell-conditions" className="space-y-4 mt-2">
          {settings ? (
            <SellConditionsForm sellConditions={settings.sell_conditions} />
          ) : (
            <Card>
              <CardContent className="py-4">
                <p className="text-center text-muted-foreground">Loading settings...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="risk-control" className="space-y-4 mt-2">
          {settings ? (
            <RiskControlForm riskControl={settings.risk_control} />
          ) : (
            <Card>
              <CardContent className="py-4">
                <p className="text-center text-muted-foreground">Loading settings...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-2">
          <GeneralSettingsForm settings={settings} />
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
