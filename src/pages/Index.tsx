
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { BadgeDollarSign, Bot, History, Settings, Activity } from "lucide-react";

const Index = () => {
  const { toast } = useToast();
  const [botStatus, setBotStatus] = useState<"idle" | "running" | "error">("idle");
  const [loading, setLoading] = useState(false);
  
  const startBot = async () => {
    setLoading(true);
    try {
      // Here we would connect to Supabase to start the bot or invoke an edge function
      setTimeout(() => {
        setBotStatus("running");
        setLoading(false);
        toast({
          title: "Bot started",
          description: "Token sniping bot is now running and monitoring for new liquidity events.",
        });
      }, 2000);
    } catch (error) {
      setLoading(false);
      setBotStatus("error");
      toast({
        variant: "destructive",
        title: "Failed to start bot",
        description: "There was an error starting the token sniping bot.",
      });
    }
  };

  const stopBot = async () => {
    setLoading(true);
    try {
      // Here we would connect to Supabase to stop the bot
      setTimeout(() => {
        setBotStatus("idle");
        setLoading(false);
        toast({
          title: "Bot stopped",
          description: "Token sniping bot has been stopped.",
        });
      }, 1000);
    } catch (error) {
      setLoading(false);
      toast({
        variant: "destructive",
        title: "Failed to stop bot",
        description: "There was an error stopping the token sniping bot.",
      });
    }
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
              <span className="text-2xl font-bold">0</span>
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
              <span className="text-2xl font-bold">0</span>
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
              <span className="text-2xl font-bold">0.00 USDC</span>
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slippage">Slippage (%)</Label>
                  <Input id="slippage" type="number" defaultValue="1.0" min="0.1" step="0.1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="swap-amount">Swap Amount (USDC)</Label>
                  <Input id="swap-amount" type="number" defaultValue="10.0" min="1" step="0.1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-profit">Target Profit (%)</Label>
                  <Input id="target-profit" type="number" defaultValue="20.0" min="1" step="1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stop-loss">Stop Loss (%)</Label>
                  <Input id="stop-loss" type="number" defaultValue="10.0" min="1" step="1" />
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rpc-url">RPC URL</Label>
                  <Input id="rpc-url" type="text" defaultValue="https://api.mainnet-beta.solana.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wallet-address">Wallet Address</Label>
                  <Input id="wallet-address" type="text" placeholder="Your Solana wallet address" />
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch id="telegram-alerts" />
                  <Label htmlFor="telegram-alerts">Enable Telegram Alerts</Label>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telegram-token">Telegram Bot Token</Label>
                    <Input id="telegram-token" type="password" placeholder="Enter your Telegram bot token" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telegram-chat-id">Telegram Chat ID</Label>
                    <Input id="telegram-chat-id" type="text" placeholder="Enter your Telegram chat ID" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-2">
          <Card>
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
              <CardDescription>Review your past token trades</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="p-4 text-center text-muted-foreground">
                  No trades have been executed yet.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
