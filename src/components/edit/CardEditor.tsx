
"use client";

import { useState, useEffect } from 'react';
import type { Card as CardType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  const [tagsInput, setTagsInput] = useState('');
  const [notesInput, setNotesInput] = useState(''); // State for notes
  const { addCardToDeck, updateCard } = useApp();
  const { t } = useLanguage();
  const { toast } = useToast();

  useEffect(() => {
    if (card) {
      setFront(card.front);
      setReading(card.reading || '');
      setTranslation(card.translation);
      setTagsInput((card.tags || []).join(', '));
      setNotesInput(card.notes || ''); // Load notes
    } else {
      // Reset for new card
      setFront('');
      setReading('');
      setTranslation('');
      setTagsInput('');
      setNotesInput(''); // Reset notes
    }
  }, [card]);

  const handleSubmit = () => {
    if (!front.trim()) {
      toast({ title: t('errorTitle'), description: t('frontRequiredError'), variant: "destructive" });
      return;
    }
    if (!translation.trim()) {
        toast({ title: t('errorTitle'), description: t('translationRequiredError'), variant: "destructive" });
        return;
    }

    const tagsArray = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

    if (card) { // Editing existing card
      updateCard({ id: card.id, front, reading, translation, tags: tagsArray, notes: notesInput });
      toast({ title: t('successTitle'), description: t('cardUpdatedMsg') });
    } else { // Adding new card
      const newCard = addCardToDeck(deckId, front, reading, translation); // Creates card with empty notes
      if (tagsArray.length > 0 || notesInput.trim() !== '') {
        // Update immediately if tags or notes were entered for the new card
        updateCard({ id: newCard.id, tags: tagsArray, notes: notesInput });
      }
      toast({ title: t('successTitle'), description: t('cardAddedMsg') });
    }
    onSave();
  };

  return (
    <div className="space-y-4 p-4 border rounded-md bg-card">
      <h3 className="text-lg font-medium">{card ? t('editCard') : t('addCard')}</h3>
      <div>
        <Label htmlFor="card-front">{t('front')}</Label>
        <Input id="card-front" value={front} onChange={(e) => setFront(e.target.value)} placeholder={t('frontPlaceholder')} />
      </div>
      <div>
        <Label htmlFor="card-reading">{t('reading')}</Label>
        <Input id="card-reading" value={reading} onChange={(e) => setReading(e.target.value)} placeholder={t('readingPlaceholder')} />
      </div>
      <div>
        <Label htmlFor="card-translation">{t('translation')}</Label>
        <Textarea id="card-translation" value={translation} onChange={(e) => setTranslation(e.target.value)} placeholder={t('translationPlaceholder')} />
      </div>
      <div>
        <Label htmlFor="card-tags">{t('tagsLabel')}</Label>
        <Input 
          id="card-tags" 
          value={tagsInput} 
          onChange={(e) => setTagsInput(e.target.value)} 
          placeholder={t('tagsPlaceholder')} 
        />
      </div>
      <div>
        <Label htmlFor="card-notes">{t('cardNotes')}</Label>
        <Textarea 
          id="card-notes" 
          value={notesInput} 
          onChange={(e) => setNotesInput(e.target.value)} 
          placeholder={t('cardNotesPlaceholder')} 
          rows={3}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>{t('cancel')}</Button>
        <Button onClick={handleSubmit}>{t('saveChanges')}</Button>
      </div>
    </div>
  );
}
