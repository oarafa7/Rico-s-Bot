
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SellConditions } from "@/lib/types";
import { useBot } from "@/hooks/use-bot";
import { ArrowUp, Clock, Percent } from "lucide-react";

// Define form schema
const sellConditionsSchema = z.object({
  target_profit: z.coerce.number().min(0),
  stop_loss: z.coerce.number().min(0),
  max_holding_time: z.coerce.number().int().min(1),
  sell_on_volatility_spike: z.boolean(),
});

type SellConditionsFormValues = z.infer<typeof sellConditionsSchema>;

export function SellConditionsForm({ sellConditions }: { sellConditions: SellConditions }) {
  const { saveSellConditions } = useBot();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set up the form
  const form = useForm<SellConditionsFormValues>({
    resolver: zodResolver(sellConditionsSchema),
    defaultValues: {
      target_profit: sellConditions?.target_profit || 20.0,
      stop_loss: sellConditions?.stop_loss || 10.0,
      max_holding_time: sellConditions?.max_holding_time || 60,
      sell_on_volatility_spike: sellConditions?.sell_on_volatility_spike || false,
    },
  });

  // Handle form submission
  const onSubmit = async (values: SellConditionsFormValues) => {
    setIsSubmitting(true);
    try {
      await saveSellConditions(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sell Conditions</CardTitle>
        <CardDescription>Configure token exit conditions</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="target_profit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <ArrowUp className="h-4 w-4" />
                      Target Profit (%)
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Percentage profit to aim for before selling
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="stop_loss"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Stop Loss (%)
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Maximum percentage loss before cutting position
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="max_holding_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Max Holding Time (minutes)
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Maximum time to hold a token before selling
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sell_on_volatility_spike"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Sell on Volatility Spike</FormLabel>
                      <FormDescription>
                        Exit position if price changes suddenly
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
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Sell Conditions"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
