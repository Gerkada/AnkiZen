"use client";

import { useState, useEffect } from 'react';
import type { Card as CardType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // Assuming Textarea is similar to Input
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { useToast } from '@/hooks/use-toast';

interface CardEditorProps {
  card: CardType | null; // Card to edit, or null for new card
  deckId: string; // Required for new card
  onSave: () => void; // Callback after saving
  onCancel: () => void;
}

export default function CardEditor({ card, deckId, onSave, onCancel }: CardEditorProps) {
  const [front, setFront] = useState('');
  const [reading, setReading] = useState('');
  const [translation, setTranslation] = useState('');
  const { addCardToDeck, updateCard } = useApp();
  const { t } = useLanguage();
  const { toast } = useToast();

  useEffect(() => {
    if (card) {
      setFront(card.front);
      setReading(card.reading);
      setTranslation(card.translation);
    } else {
      // Reset for new card
      setFront('');
      setReading('');
      setTranslation('');
    }
  }, [card]);

  const handleSubmit = () => {
    if (!front.trim() || !translation.trim()) {
      toast({ title: "Error", description: "Front and Translation fields are required.", variant: "destructive" });
      return;
    }

    if (card) { // Editing existing card
      updateCard({ id: card.id, front, reading, translation });
      toast({ title: "Success", description: "Card updated." });
    } else { // Adding new card
      addCardToDeck(deckId, front, reading, translation);
      toast({ title: "Success", description: "Card added." });
    }
    onSave();
  };

  return (
    <div className="space-y-4 p-4 border rounded-md bg-card">
      <h3 className="text-lg font-medium">{card ? t('editCard') : t('addCard')}</h3>
      <div>
        <Label htmlFor="card-front">{t('front')}</Label>
        <Input id="card-front" value={front} onChange={(e) => setFront(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="card-reading">{t('reading')}</Label>
        <Input id="card-reading" value={reading} onChange={(e) => setReading(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="card-translation">{t('translation')}</Label>
        <Textarea id="card-translation" value={translation} onChange={(e) => setTranslation(e.target.value)} />
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>{t('cancel')}</Button>
        <Button onClick={handleSubmit}>{t('saveChanges')}</Button>
      </div>
    </div>
  );
}
