
"use client";

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useToast } from '@/hooks/use-toast';

interface CustomStudyDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  deck: Deck;
}

const DEFAULT_CUSTOM_SESSION_LIMIT = 50;

export default function CustomStudyDialog({ isOpen, onOpenChange, deck }: CustomStudyDialogProps) {
  const [tagsInput, setTagsInput] = useState('');
  const [limitInput, setLimitInput] = useState<string | number>(DEFAULT_CUSTOM_SESSION_LIMIT);
  const { setCustomStudyParams, setSelectedDeckId, setCurrentView, getCardsByDeckId } = useApp();
  const { t } = useLanguage();
  const { toast } = useToast();

  const getFilteredCardCount = (tags: string[]): number => {
    const allCards = getCardsByDeckId(deck.id);
    if (tags.length === 0) return allCards.length;
    return allCards.filter(card => tags.some(tag => card.tags.includes(tag))).length;
  };

  const handleSubmit = (mode: 'study' | 'test') => {
    const tagsToInclude = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
    const limit = parseInt(String(limitInput), 10);

    if (isNaN(limit) || limit <= 0) {
      toast({ title: t('errorTitle'), description: t('errorInvalidNumber'), variant: "destructive" });
      return;
    }
    
    const availableCardsCount = getFilteredCardCount(tagsToInclude);
    if (availableCardsCount === 0) {
        toast({ title: t('infoTitle'), description: t('notEnoughCardsForCustomSession'), variant: "default" });
        return;
    }

    setCustomStudyParams({
      deckId: deck.id,
      tagsToInclude,
      limit,
      mode,
    });
    setSelectedDeckId(deck.id);
    setCurrentView(mode);
    onOpenChange(false);
    setTagsInput(''); // Reset for next time
    setLimitInput(DEFAULT_CUSTOM_SESSION_LIMIT);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('customStudyDialogTitle')}</DialogTitle>
          <DialogDescription>{t('deckName')}: {deck.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="custom-tags">{t('customStudyTagsLabel')}</Label>
            <Input
              id="custom-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={t('customStudyTagsPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-limit">{t('customStudyLimitLabel')}</Label>
            <Input
              id="custom-limit"
              type="number"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              min="1"
            />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">{t('cancel')}</Button>
          </DialogClose>
          <Button onClick={() => handleSubmit('study')} className="w-full sm:w-auto">{t('customStudyStartStudy')}</Button>
          <Button onClick={() => handleSubmit('test')} className="w-full sm:w-auto">{t('customStudyStartTest')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
