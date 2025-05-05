
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RiskControl } from "@/lib/types";
import { useBot } from "@/hooks/use-bot";
import { Shield, Percent, Timer } from "lucide-react";

// Define form schema
const riskControlSchema = z.object({
  position_size_percentage: z.coerce.number().min(0.1).max(100),
  max_open_trades: z.coerce.number().int().min(1),
  cooldown_period: z.coerce.number().int().min(0),
});

type RiskControlFormValues = z.infer<typeof riskControlSchema>;

export function RiskControlForm({ riskControl }: { riskControl: RiskControl }) {
  const { saveRiskControl } = useBot();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set up the form
  const form = useForm<RiskControlFormValues>({
    resolver: zodResolver(riskControlSchema),
    defaultValues: {
      position_size_percentage: riskControl?.position_size_percentage || 5.0,
      max_open_trades: riskControl?.max_open_trades || 3,
      cooldown_period: riskControl?.cooldown_period || 30,
    },
  });

  // Handle form submission
  const onSubmit = async (values: RiskControlFormValues) => {
    setIsSubmitting(true);
    try {
      await saveRiskControl(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Risk Control
        </CardTitle>
        <CardDescription>Configure risk management parameters</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="position_size_percentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Position Size (% of Balance)
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} />
                  </FormControl>
                  <FormDescription>
                    Percentage of available balance to use per trade
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="max_open_trades"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Open Trades</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Maximum number of positions to hold simultaneously
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="cooldown_period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Timer className="h-4 w-4" />
                      Cooldown Period (seconds)
                    </FormLabel>
                    <FormControl>
                      <Input type="number" step="1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Minimum wait time between trades
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Risk Settings"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
