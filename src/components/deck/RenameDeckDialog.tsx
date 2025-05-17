"use client";

import { useState, useEffect } from 'react';
import type { Deck } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useToast } from '@/hooks/use-toast';

interface RenameDeckDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  deck: Deck | null;
}

export default function RenameDeckDialog({ isOpen, onOpenChange, deck }: RenameDeckDialogProps) {
  const [newName, setNewName] = useState('');
  const { renameDeck } = useApp();
  const { t } = useLanguage();
  const { toast } = useToast();

  useEffect(() => {
    if (deck) {
      setNewName(deck.name);
    }
  }, [deck]);

  const handleSubmit = () => {
    if (!deck) return;
    if (!newName.trim()) {
      toast({ title: "Error", description: "Deck name cannot be empty.", variant: "destructive" });
      return;
    }

    renameDeck(deck.id, newName.trim());
    toast({ title: "Success", description: `Deck renamed to "${newName.trim()}".` });
    onOpenChange(false);
  };

  if (!deck) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('renameDeck')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-deck-name" className="text-right">
              {t('deckName')}
            </Label>
            <Input
              id="new-deck-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t('cancel')}</Button>
          </DialogClose>
          <Button onClick={handleSubmit}>{t('save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
