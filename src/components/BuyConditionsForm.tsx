
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { BuyConditions } from "@/lib/types";
import { useBot } from "@/hooks/use-bot";
import { ArrowDown, SlidersHorizontal, Zap, Shield } from "lucide-react";

// Define form schema
const buyConditionsSchema = z.object({
  minimum_liquidity: z.coerce.number().min(0),
  slippage: z.coerce.number().min(0.1).max(100),
  require_verified_contract: z.boolean(),
  max_priority_fee: z.coerce.number().min(0),
  enable_antibot: z.boolean(),
  // We'll handle allowed_dexes separately because it's an array
});

type BuyConditionsFormValues = z.infer<typeof buyConditionsSchema>;

export function BuyConditionsForm({ buyConditions }: { buyConditions: BuyConditions }) {
  const { saveBuyConditions } = useBot();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDexes, setSelectedDexes] = useState<string[]>(buyConditions?.allowed_dexes || ["jupiter", "raydium"]);

  // Available DEXs
  const dexOptions = [
    { id: "jupiter", label: "Jupiter" },
    { id: "raydium", label: "Raydium" },
    { id: "orca", label: "Orca" },
  ];

  // Set up the form
  const form = useForm<BuyConditionsFormValues>({
    resolver: zodResolver(buyConditionsSchema),
    defaultValues: {
      minimum_liquidity: buyConditions?.minimum_liquidity || 1000.0,
      slippage: buyConditions?.slippage || 1.0,
      require_verified_contract: buyConditions?.require_verified_contract || true,
      max_priority_fee: buyConditions?.max_priority_fee || 0.000005,
      enable_antibot: buyConditions?.enable_antibot || true,
    },
  });

  // Handle form submission
  const onSubmit = async (values: BuyConditionsFormValues) => {
    setIsSubmitting(true);
    try {
      await saveBuyConditions({
        ...values,
        allowed_dexes: selectedDexes,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle DEX selection
  const handleDexChange = (dexId: string, checked: boolean) => {
    setSelectedDexes(prev => 
      checked 
        ? [...prev, dexId]
        : prev.filter(id => id !== dexId)
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buy Conditions</CardTitle>
        <CardDescription>Configure token entry conditions</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="minimum_liquidity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <ArrowDown className="h-4 w-4" />
                      Minimum Liquidity (USDC)
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="100" {...field} />
                    </FormControl>
                    <FormDescription>
                      Minimum liquidity required in the token pool
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="slippage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      Slippage Tolerance (%)
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Maximum allowed slippage for trades
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <h3 className="font-medium mb-2">Allowed DEXs</h3>
              <div className="flex flex-col gap-2">
                {dexOptions.map((dex) => (
                  <div key={dex.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`dex-${dex.id}`} 
                      checked={selectedDexes.includes(dex.id)}
                      onCheckedChange={(checked) => handleDexChange(dex.id, checked === true)}
                    />
                    <label htmlFor={`dex-${dex.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {dex.label}
                    </label>
                  </div>
                ))}
              </div>
              {selectedDexes.length === 0 && (
                <p className="text-sm font-medium text-destructive mt-2">
                  Select at least one DEX
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="max_priority_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Priority Fee (SOL)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.000001" {...field} />
                    </FormControl>
                    <FormDescription>
                      Maximum priority fee for transactions
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="require_verified_contract"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Verified Contract Only
                        </FormLabel>
                        <FormDescription>
                          Only trade tokens with verified contracts
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

                <FormField
                  control={form.control}
                  name="enable_antibot"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Anti-bot Protection
                        </FormLabel>
                        <FormDescription>
                          Detect and avoid tokens with anti-bot mechanisms
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
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting || selectedDexes.length === 0}>
              {isSubmitting ? "Saving..." : "Save Buy Conditions"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
