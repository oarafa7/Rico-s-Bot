
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BotSettings } from "@/lib/types";
import { useBot } from "@/hooks/use-bot";
import { Settings } from "lucide-react";

// Define form schema
const generalSettingsSchema = z.object({
  rpc_url: z.string().url("Must be a valid URL"),
  wallet_address: z.string().min(32).max(44),
  telegram_enabled: z.boolean(),
  telegram_token: z.string().optional(),
  telegram_chat_id: z.string().optional(),
});

type GeneralSettingsFormValues = z.infer<typeof generalSettingsSchema>;

export function GeneralSettingsForm({ settings }: { settings: BotSettings | null }) {
  const { saveGeneralSettings } = useBot();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set up the form
  const form = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      rpc_url: settings?.rpc_url || "https://api.mainnet-beta.solana.com",
      wallet_address: settings?.wallet_address || "",
      telegram_enabled: settings?.telegram_enabled || false,
      telegram_token: settings?.telegram_token || "",
      telegram_chat_id: settings?.telegram_chat_id || "",
    },
  });

  // Handle form submission
  const onSubmit = async (values: GeneralSettingsFormValues) => {
    setIsSubmitting(true);
    try {
      await saveGeneralSettings(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          General Settings
        </CardTitle>
        <CardDescription>Configure basic bot parameters</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
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
                    <FormDescription>
                      Solana RPC endpoint (use a reliable provider)
                    </FormDescription>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save General Settings"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
