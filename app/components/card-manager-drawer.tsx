import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  addCustomCard,
  calculateCashbackPercentage,
  type CreditCard,
  deleteCard,
  resetPresetCard,
  sortCards,
  updateCard,
} from "@/lib/credit-cards";

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
  const [formData, setFormData] = useState<{
    issuer: string;
    name: string;
    pointsPerDollar: string;
    valuePerPoint: string;
  }>({
    issuer: "",
    name: "",
    pointsPerDollar: "",
    valuePerPoint: "",
  });

  const sortedCards = sortCards(cards);

  const handleStartCreate = () => {
    setFormData({
      issuer: "",
      name: "",
      pointsPerDollar: "1.5",
      valuePerPoint: "0.01",
    });
    setEditMode({ type: "create" });
  };

  const handleStartEdit = (card: CreditCard) => {
    setFormData({
      issuer: card.issuer || "",
      name: card.name,
      pointsPerDollar: card.pointsPerDollar.toString(),
      valuePerPoint: card.valuePerPoint.toString(),
    });
    setEditMode({ cardId: card.id, type: "edit" });
  };

  const handleCancelEdit = () => {
    setEditMode(null);
    setFormData({
      issuer: "",
      name: "",
      pointsPerDollar: "",
      valuePerPoint: "",
    });
  };

  const handleSaveCreate = () => {
    try {
      const newCard = addCustomCard({
        isCustomizable: false,
        issuer: formData.issuer || undefined,
        name: formData.name,
        pointsPerDollar: parseFloat(formData.pointsPerDollar),
        valuePerPoint: parseFloat(formData.valuePerPoint),
      });
      onCardsChange([...cards, newCard]);
      handleCancelEdit();
    } catch (error) {
      console.error("Failed to create card:", error);
      alert("Failed to create card. Please check your input.");
    }
  };

  const handleSaveEdit = (cardId: string) => {
    try {
      const updatedCards = updateCard(cards, cardId, {
        issuer: formData.issuer || undefined,
        name: formData.name,
        pointsPerDollar: parseFloat(formData.pointsPerDollar),
        valuePerPoint: parseFloat(formData.valuePerPoint),
      });
      onCardsChange(updatedCards);
      handleCancelEdit();
    } catch (error) {
      console.error("Failed to update card:", error);
      alert("Failed to update card. Please check your input.");
    }
  };

  const handleDelete = (cardId: string) => {
    if (!confirm("Are you sure you want to delete this card?")) return;

    try {
      const updatedCards = deleteCard(cards, cardId);
      onCardsChange(updatedCards);
    } catch (error) {
      console.error("Failed to delete card:", error);
      alert("Cannot delete preset cards.");
    }
  };

  const handleReset = (cardId: string) => {
    if (!confirm("Are you sure you want to reset this card to default values?"))
      {return;}

    try {
      const updatedCards = resetPresetCard(cards, cardId);
      onCardsChange(updatedCards);
    } catch (error) {
      console.error("Failed to reset card:", error);
      alert("Failed to reset card.");
    }
  };

  return (
    <Sheet onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Manage Credit Cards</SheetTitle>
          <SheetDescription>
            Add custom cards or customize preset card values. Changes are saved
            to your browser.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Create/Edit Form */}
          {editMode ? <div className="space-y-4 rounded-lg border border-primary bg-primary/5 p-4">
              <h3 className="text-sm font-semibold">
                {editMode.type === "create" ? "Add New Card" : "Edit Card"}
              </h3>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="card-name">Card Name *</Label>
                  <Input
                    id="card-name"
                    onChange={(e) =>
                      { setFormData({ ...formData, name: e.target.value }); }
                    }
                    placeholder="e.g., Chase Sapphire Reserve"
                    value={formData.name}
                  />
                </div>

                <div>
                  <Label htmlFor="card-issuer">Issuer (Optional)</Label>
                  <Input
                    id="card-issuer"
                    onChange={(e) =>
                      { setFormData({ ...formData, issuer: e.target.value }); }
                    }
                    placeholder="e.g., Chase, AmEx, Capital One"
                    value={formData.issuer}
                  />
                </div>

                <div>
                  <Label htmlFor="points-per-dollar">Points Per Dollar *</Label>
                  <Input
                    id="points-per-dollar"
                    min="0"
                    onChange={(e) =>
                      { setFormData({
                        ...formData,
                        pointsPerDollar: e.target.value,
                      }); }
                    }
                    placeholder="1.5"
                    step="0.1"
                    type="number"
                    value={formData.pointsPerDollar}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    How many points you earn per $1 spent
                  </p>
                </div>

                <div>
                  <Label htmlFor="value-per-point">Value Per Point (¢) *</Label>
                  <Input
                    id="value-per-point"
                    min="0"
                    onChange={(e) =>
                      { setFormData({
                        ...formData,
                        valuePerPoint: e.target.value,
                      }); }
                    }
                    placeholder="0.021"
                    step="0.001"
                    type="number"
                    value={formData.valuePerPoint}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Value in dollars per point (e.g., 0.021 = 2.1¢)
                  </p>
                </div>

                {formData.pointsPerDollar && formData.valuePerPoint ? <div className="rounded bg-muted p-2 text-sm">
                    <strong>Effective Cashback:</strong>{" "}
                    {(
                      parseFloat(formData.pointsPerDollar) *
                      parseFloat(formData.valuePerPoint) *
                      100
                    ).toFixed(2)}
                    %
                  </div> : null}
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={
                    editMode.type === "create" ?
                      handleSaveCreate
                    : () => { handleSaveEdit(editMode.cardId); }
                  }
                  size="sm"
                >
                  {editMode.type === "create" ? "Add Card" : "Save Changes"}
                </Button>
                <Button onClick={handleCancelEdit} size="sm" variant="outline">
                  Cancel
                </Button>
              </div>
            </div> : null}

          {/* Add Card Button */}
          {!editMode && (
            <Button
              className="w-full"
              onClick={handleStartCreate}
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Custom Card
            </Button>
          )}

          {/* Cards List */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Your Cards
            </h3>
            {sortedCards.map((card) => {
              const cashback = calculateCashbackPercentage(card);
              const isEditing =
                editMode?.type === "edit" && editMode.cardId === card.id;

              return (
                <div
                  className={`rounded-lg border p-3 transition-colors ${
                    isEditing ? "border-primary bg-primary/5" : ""
                  }`}
                  key={card.id}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {card.name}
                      </div>
                      {card.issuer ? <div className="text-xs text-muted-foreground">
                          {card.issuer}
                        </div> : null}
                      <div className="mt-1 text-xs text-muted-foreground">
                        {card.pointsPerDollar}x points @{" "}
                        {(card.valuePerPoint * 100).toFixed(2)}¢ ={" "}
                        <strong className="text-foreground">
                          {cashback.toFixed(2)}%
                        </strong>
                      </div>
                      {card.isPreset ? <div className="mt-1">
                          <span className="inline-block rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                            Preset
                          </span>
                        </div> : null}
                    </div>

                    <div className="flex flex-shrink-0 gap-1">
                      {(card.isCustomizable || !card.isPreset) ? <Button
                          onClick={() => { handleStartEdit(card); }}
                          size="sm"
                          variant="ghost"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button> : null}
                      {card.isPreset && card.isCustomizable ? <Button
                          onClick={() => { handleReset(card.id); }}
                          size="sm"
                          variant="ghost"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button> : null}
                      {!card.isPreset && (
                        <Button
                          onClick={() => { handleDelete(card.id); }}
                          size="sm"
                          variant="ghost"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
