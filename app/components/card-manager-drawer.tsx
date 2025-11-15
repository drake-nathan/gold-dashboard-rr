import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { SwipeableCard } from "@/components/ui/swipeable-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  addCustomCard,
  calculateCashbackPercentage,
  calculateSubBonusPercentage,
  calculateTotalCashbackPercentage,
  clearCreditCards,
  type CreditCard,
  DEFAULT_PRESET_CARDS,
  deleteCard,
  resetPresetCard,
  sortCards,
  updateCard,
} from "@/lib/credit-cards";

// Form schema - valuePerPointCents accepts cents (not dollars)
const cardFormSchema = z.object({
  cardType: z.enum(["cashback", "travel"]),
  issuer: z.string().optional(),
  name: z
    .string()
    .min(1, "Card name is required")
    .max(100, "Card name is too long"),
  pointsPerDollar: z
    .number({ message: "Must be a number" })
    .min(0, "Must be 0 or greater")
    .max(100, "Must be 100 or less"),
  signupBonusEnabled: z.boolean().default(false),
  signupBonusPoints: z
    .number({ message: "Must be a number" })
    .min(0, "Must be 0 or greater")
    .default(0),
  signupBonusSpend: z
    .number({ message: "Must be a number" })
    .min(0, "Must be 0 or greater")
    .default(0),
  valuePerPointCents: z
    .number({ message: "Must be a number" })
    .min(0, "Must be 0 or greater")
    .max(100, "Must be 100 or less"),
});

type CardFormValues = z.infer<typeof cardFormSchema>;

interface CardManagerDrawerProps {
  cards: CreditCard[];
  onCardsChange: (cards: CreditCard[]) => void;
  onClose: () => void;
  open: boolean;
}

type EditMode = null | { cardId: string; type: "edit" } | { type: "create" };

export const CardManagerDrawer = ({
  cards,
  onCardsChange,
  onClose,
  open,
}: CardManagerDrawerProps) => {
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    action: () => void;
    description: string;
    open: boolean;
    title: string;
    variant?: "danger" | "default";
  }>({
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    action: () => {},
    description: "",
    open: false,
    title: "",
  });

  const form = useForm<CardFormValues>({
    defaultValues: {
      cardType: "cashback",
      issuer: "",
      name: "",
      pointsPerDollar: 1.5,
      signupBonusEnabled: false,
      signupBonusPoints: 0,
      signupBonusSpend: 0,
      valuePerPointCents: 1.0,
    },
    resolver: zodResolver(cardFormSchema),
  });

  const sortedCards = sortCards(cards);

  // Watch form values for real-time cashback calculation
  const pointsPerDollar = useWatch({
    control: form.control,
    name: "pointsPerDollar",
  });
  const valuePerPointCents = useWatch({
    control: form.control,
    name: "valuePerPointCents",
  });
  const signupBonusEnabled = useWatch({
    control: form.control,
    name: "signupBonusEnabled",
  });
  const signupBonusPoints = useWatch({
    control: form.control,
    name: "signupBonusPoints",
  });
  const signupBonusSpend = useWatch({
    control: form.control,
    name: "signupBonusSpend",
  });

  const baseCashback = pointsPerDollar * (valuePerPointCents / 100) * 100;
  const subBonus =
    signupBonusEnabled && signupBonusSpend > 0 ?
      (signupBonusPoints / signupBonusSpend) * (valuePerPointCents / 100) * 100
    : 0;
  const totalCashback = baseCashback + subBonus;

  const handleStartCreate = () => {
    form.reset({
      cardType: "cashback",
      issuer: "",
      name: "",
      pointsPerDollar: 1.5,
      signupBonusEnabled: false,
      signupBonusPoints: 0,
      signupBonusSpend: 0,
      valuePerPointCents: 1.0,
    });
    setEditMode({ type: "create" });
  };

  const handleStartEdit = (card: CreditCard) => {
    form.reset({
      cardType: card.cardType,
      issuer: card.issuer || "",
      name: card.name,
      pointsPerDollar: card.pointsPerDollar,
      signupBonusEnabled: card.signupBonus?.enabled ?? false,
      signupBonusPoints: card.signupBonus?.pointsBonus ?? 0,
      signupBonusSpend: card.signupBonus?.spendRequirement ?? 0,
      valuePerPointCents: parseFloat((card.valuePerPoint * 100).toFixed(2)), // Convert dollars to cents and round to 2 decimals
    });
    setEditMode({ cardId: card.id, type: "edit" });
  };

  const handleCancelEdit = () => {
    setEditMode(null);
    form.reset();
  };

  const onSubmit = (values: CardFormValues) => {
    try {
      const signupBonus =
        values.signupBonusEnabled ?
          {
            enabled: true,
            pointsBonus: values.signupBonusPoints,
            spendRequirement: values.signupBonusSpend,
          }
        : undefined;

      if (editMode?.type === "create") {
        const newCard = addCustomCard({
          cardType: values.cardType,
          isCustomizable: false,
          issuer: values.issuer || undefined,
          name: values.name,
          pointsPerDollar: values.pointsPerDollar,
          signupBonus,
          valuePerPoint: values.valuePerPointCents / 100, // Convert cents to dollars
        });
        onCardsChange([...cards, newCard]);
        toast.success("Card added", {
          description: `${values.name} has been added successfully.`,
        });
      } else if (editMode?.type === "edit") {
        const updatedCards = updateCard(cards, editMode.cardId, {
          cardType: values.cardType,
          issuer: values.issuer || undefined,
          name: values.name,
          pointsPerDollar: values.pointsPerDollar,
          signupBonus,
          valuePerPoint: values.valuePerPointCents / 100, // Convert cents to dollars
        });
        onCardsChange(updatedCards);
        toast.success("Card updated", {
          description: `${values.name} has been updated successfully.`,
        });
      }
      handleCancelEdit();
    } catch (error) {
      console.error("Failed to save card:", error);
      toast.error("Error", {
        description: "Failed to save card. Please check your input.",
      });
    }
  };

  const handleDelete = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    setConfirmDialog({
      action: () => {
        try {
          const updatedCards = deleteCard(cards, cardId);
          onCardsChange(updatedCards);
          toast.success("Card deleted", {
            description: `${card.name} has been deleted.`,
          });
        } catch (error) {
          console.error("Failed to delete card:", error);
          toast.error("Error", {
            description: "Cannot delete preset cards.",
          });
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      },
      description: `Are you sure you want to delete "${card.name}"? This action cannot be undone.`,
      open: true,
      title: "Delete card",
      variant: "danger",
    });
  };

  const handleReset = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    setConfirmDialog({
      action: () => {
        try {
          const updatedCards = resetPresetCard(cards, cardId);
          onCardsChange(updatedCards);
          toast.success("Card reset", {
            description: `${card.name} has been reset to default values.`,
          });
        } catch (error) {
          console.error("Failed to reset card:", error);
          toast.error("Error", {
            description: "Failed to reset card.",
          });
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      },
      description: `Are you sure you want to reset "${card.name}" to its default values?`,
      open: true,
      title: "Reset card",
      variant: "default",
    });
  };

  const handleResetAll = () => {
    setConfirmDialog({
      action: () => {
        try {
          clearCreditCards();
          onCardsChange(DEFAULT_PRESET_CARDS);
          toast.success("All cards reset", {
            description:
              "All custom cards have been deleted and preset cards have been reset to default values.",
          });
        } catch (error) {
          console.error("Failed to reset all cards:", error);
          toast.error("Error", {
            description: "Failed to reset cards.",
          });
        }
        setConfirmDialog({ ...confirmDialog, open: false });
      },
      description:
        "This will delete all custom cards and reset all preset cards to their default values. This action cannot be undone.",
      open: true,
      title: "Reset all cards",
      variant: "danger",
    });
  };

  return (
    <Sheet
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      open={open}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Manage Credit Cards</SheetTitle>
          <SheetDescription>
            Add custom cards or customize preset card values (points per dollar
            & value per point). Changes are saved to your browser.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          {/* Create/Edit Form */}
          {editMode ?
            <Form {...form}>
              <form
                className="space-y-4 rounded-lg border border-primary bg-primary/5 p-4"
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <h3 className="text-sm font-semibold">
                  {editMode.type === "create" ? "Add New Card" : "Edit Card"}
                </h3>

                <div className="space-y-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Card Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Chase Sapphire Reserve"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cardType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reward Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select reward type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cashback">
                              Cashback (flat percentage back)
                            </SelectItem>
                            <SelectItem value="travel">
                              Travel Points (earn points for travel)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How rewards are calculated: cashback shows total cash
                          back, travel shows points earned and cost per point
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="issuer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Issuer (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Chase, AmEx, Capital One"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pointsPerDollar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Points Per Dollar</FormLabel>
                        <FormControl>
                          <Input
                            min="0"
                            placeholder="1.5"
                            step="0.1"
                            type="number"
                            {...field}
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value));
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          How many points you earn per $1 spent
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="valuePerPointCents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Value Per Point (cents)</FormLabel>
                        <FormControl>
                          <Input
                            min="0"
                            placeholder="2.1"
                            step="0.01"
                            type="number"
                            {...field}
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value));
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Value in cents per point (e.g., 2.1¢, 1.85¢)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Signup Bonus Section */}
                  <div className="space-y-3 rounded-lg border border-muted bg-muted/30 p-3">
                    <FormField
                      control={form.control}
                      name="signupBonusEnabled"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between space-y-0">
                          <div className="space-y-0.5">
                            <FormLabel>Signup Bonus (Optional)</FormLabel>
                            <FormDescription>
                              Enable to add SUB bonus to cashback calculation
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

                    {signupBonusEnabled && (
                      <>
                        <FormField
                          control={form.control}
                          name="signupBonusPoints"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bonus Points</FormLabel>
                              <FormControl>
                                <Input
                                  min="0"
                                  placeholder="60000"
                                  step="1000"
                                  type="number"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(parseFloat(e.target.value));
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                Total bonus points to earn (e.g., 60,000)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="signupBonusSpend"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Spend Requirement ($)</FormLabel>
                              <FormControl>
                                <Input
                                  min="0"
                                  placeholder="4000"
                                  step="100"
                                  type="number"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(parseFloat(e.target.value));
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                Required spend to earn bonus (e.g., $4,000)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>

                  {/* Cashback Summary */}
                  {!isNaN(baseCashback) && (
                    <div className="space-y-1 rounded bg-muted p-3 text-sm">
                      <div className="flex justify-between">
                        <span>Base Cashback:</span>
                        <strong>{baseCashback.toFixed(2)}%</strong>
                      </div>
                      {signupBonusEnabled && subBonus > 0 && (
                        <>
                          <div className="flex justify-between text-primary">
                            <span>SUB Bonus:</span>
                            <strong>+{subBonus.toFixed(2)}%</strong>
                          </div>
                          <div className="flex justify-between border-t border-border pt-1 text-base font-bold">
                            <span>Total with SUB:</span>
                            <span className="text-primary">
                              {totalCashback.toFixed(2)}%
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1" size="sm" type="submit">
                    {editMode.type === "create" ? "Add Card" : "Save Changes"}
                  </Button>
                  <Button
                    onClick={handleCancelEdit}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          : null}

          {/* Add Card Button and Reset All Button */}
          {!editMode && (
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={handleStartCreate}
                variant="outline"
              >
                <Plus className="size-4" />
                Add Custom Card
              </Button>
              <Button onClick={handleResetAll} variant="outline">
                <RotateCcw className="size-4" />
                Reset All
              </Button>
            </div>
          )}

          {/* Cards List */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Your Cards
            </h3>
            {sortedCards.length === 0 ?
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No cards yet. Add a custom card or use the preset cards above.
                </p>
              </div>
            : sortedCards.map((card) => {
                const cashback = calculateCashbackPercentage(card);
                const isEditing =
                  editMode?.type === "edit" && editMode.cardId === card.id;

                return (
                  <SwipeableCard
                    key={card.id}
                    onDelete={
                      !card.isPreset ?
                        () => {
                          handleDelete(card.id);
                        }
                      : undefined
                    }
                  >
                    <div
                      className={`rounded-lg border bg-card p-3 transition-colors ${
                        isEditing ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-semibold">
                              {card.name}
                            </div>
                            {card.isPreset ?
                              <Badge variant="secondary">Preset</Badge>
                            : null}
                          </div>
                          {card.issuer ?
                            <div className="text-xs text-muted-foreground">
                              {card.issuer}
                            </div>
                          : null}
                          <div className="mt-1.5 text-xs text-muted-foreground">
                            {card.pointsPerDollar}x @{" "}
                            {(card.valuePerPoint * 100).toFixed(2)}¢ ={" "}
                            <span className="font-bold text-primary">
                              {cashback.toFixed(2)}%
                            </span>
                            {card.signupBonus?.enabled && (
                              <span className="ml-1 text-primary">
                                (SUB: +
                                {calculateSubBonusPercentage(card).toFixed(2)}% ={" "}
                                {calculateTotalCashbackPercentage(card).toFixed(
                                  2,
                                )}
                                %)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-1">
                          {card.isCustomizable || !card.isPreset ?
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  aria-label="Edit card"
                                  className="h-9 w-9"
                                  onClick={() => {
                                    handleStartEdit(card);
                                  }}
                                  size="icon"
                                  variant="ghost"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit card</TooltipContent>
                            </Tooltip>
                          : null}
                          {card.isPreset && card.isCustomizable ?
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  aria-label="Reset to default"
                                  className="h-9 w-9"
                                  onClick={() => {
                                    handleReset(card.id);
                                  }}
                                  size="icon"
                                  variant="ghost"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Reset to default</TooltipContent>
                            </Tooltip>
                          : null}
                          {!card.isPreset && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  aria-label="Delete card"
                                  className="h-9 w-9"
                                  onClick={() => {
                                    handleDelete(card.id);
                                  }}
                                  size="icon"
                                  variant="ghost"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete card</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </div>
                  </SwipeableCard>
                );
              })
            }
          </div>
        </div>
      </SheetContent>

      <ConfirmationDialog
        cancelText={confirmDialog.variant === "danger" ? "Cancel" : undefined}
        confirmText={confirmDialog.variant === "danger" ? "Delete" : "Reset"}
        description={confirmDialog.description}
        onCancel={() => {
          setConfirmDialog({ ...confirmDialog, open: false });
        }}
        onConfirm={confirmDialog.action}
        open={confirmDialog.open}
        title={confirmDialog.title}
        variant={confirmDialog.variant}
      />
    </Sheet>
  );
};
