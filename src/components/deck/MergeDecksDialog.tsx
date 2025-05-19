
"use client";

import { useState, useEffect } from 'react';
import type { Deck } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MergeDecksDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function MergeDecksDialog({ isOpen, onOpenChange }: MergeDecksDialogProps) {
  const { decks, mergeDecks: mergeDecksAction } = useApp();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [sourceDeckIds, setSourceDeckIds] = useState<Set<string>>(new Set());
  const [targetDeckId, setTargetDeckId] = useState<string | null>(null);
  const [availableTargetDecks, setAvailableTargetDecks] = useState<Deck[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Reset state when dialog opens
      setSourceDeckIds(new Set());
      setTargetDeckId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setAvailableTargetDecks(decks.filter(deck => !sourceDeckIds.has(deck.id)));
    // If current target is now a source, deselect it
    if (targetDeckId && sourceDeckIds.has(targetDeckId)) {
      setTargetDeckId(null);
    }
  }, [sourceDeckIds, decks, targetDeckId]);

  const handleSourceDeckToggle = (deckId: string, checked: boolean) => {
    setSourceDeckIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(deckId);
      } else {
        newSet.delete(deckId);
      }
      return newSet;
    });
  };

  const handleSubmit = async () => {
    if (sourceDeckIds.size === 0 || !targetDeckId) {
      toast({ title: t('errorTitle'), description: t('mergeDecksValidationError'), variant: 'destructive' });
      return;
    }

    try {
      const result = await mergeDecksAction(Array.from(sourceDeckIds), targetDeckId);
      toast({
        title: t('successTitle'),
        description: t('mergeDecksSuccessToast', {
          mergedCount: result.mergedCardsCount,
          skippedCount: result.skippedDuplicatesCount,
          sourceCount: result.deletedDeckNames.length,
          sourceNames: result.deletedDeckNames.join(', '),
          targetName: result.targetDeckName,
        }),
        duration: 7000, // Longer duration for more text
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Merge decks error:", error);
      toast({ title: t('errorTitle'), description: (error as Error).message || t('mergeDecksErrorGeneral'), variant: 'destructive' });
    }
  };

  const canSubmit = sourceDeckIds.size > 0 && targetDeckId !== null;

  if (decks.length < 2) { // Should ideally be caught by disabling the trigger button
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('mergeDecksDialogTitle')}</DialogTitle>
          <DialogDescription>{t('mergeDecksDialogDescription')}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div>
            <Label className="font-semibold">{t('mergeDecksSelectSources')}</Label>
            <ScrollArea className="h-40 mt-1 rounded-md border p-2">
              {decks.map((deck) => (
                <div key={deck.id} className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id={`source-${deck.id}`}
                    checked={sourceDeckIds.has(deck.id)}
                    onCheckedChange={(checked) => handleSourceDeckToggle(deck.id, !!checked)}
                    disabled={deck.id === targetDeckId} 
                  />
                  <Label htmlFor={`source-${deck.id}`} className="cursor-pointer flex-grow">
                    {deck.name}
                  </Label>
                </div>
              ))}
            </ScrollArea>
          </div>

          <div>
            <Label htmlFor="target-deck" className="font-semibold">{t('mergeDecksSelectTarget')}</Label>
            <Select
              value={targetDeckId || undefined}
              onValueChange={(value) => setTargetDeckId(value)}
              disabled={availableTargetDecks.length === 0}
            >
              <SelectTrigger id="target-deck" className="mt-1">
                <SelectValue placeholder={t('mergeDecksSelectTargetPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {availableTargetDecks.map((deck) => (
                  <SelectItem key={deck.id} value={deck.id}>
                    {deck.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
             {availableTargetDecks.length === 0 && sourceDeckIds.size > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{t('mergeDecksNoTargetsAvailable')}</p>
            )}
          </div>
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('mergeDecksWarningSourceDeleted')}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('cancel')}</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {t('mergeDecksConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
