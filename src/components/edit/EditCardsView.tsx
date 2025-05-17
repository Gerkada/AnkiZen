"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Card as CardType } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle, Edit2, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CardEditor from './CardEditor';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function EditCardsView() {
  const { 
    selectedDeckId, 
    getDeckById, 
    getCardsByDeckId, 
    setCurrentView,
    deleteCard,
  } = useApp();
  const { t } = useLanguage();

  const [editingCard, setEditingCard] = useState<CardType | null>(null); // For editing existing card
  const [isAddingCard, setIsAddingCard] = useState(false); // For adding new card
  const [cardToDelete, setCardToDelete] = useState<CardType | null>(null);


  const deck = useMemo(() => selectedDeckId ? getDeckById(selectedDeckId) : null, [selectedDeckId, getDeckById]);
  const cardsInDeck = useMemo(() => selectedDeckId ? getCardsByDeckId(selectedDeckId) : [], [selectedDeckId, getCardsByDeckId]);
  
  // Sort cards by creation date for consistent display
  const sortedCards = useMemo(() => {
    return [...cardsInDeck].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [cardsInDeck]);


  if (!deck) {
    return (
      <div className="text-center py-10">
        <p>{t('selectDeckToStudy')}</p> {/* Re-use string, or make specific */}
        <Button onClick={() => setCurrentView('deck-list')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
        </Button>
      </div>
    );
  }

  const handleEdit = (card: CardType) => {
    setEditingCard(card);
    setIsAddingCard(false); // Ensure not in add mode
  };

  const handleAddNew = () => {
    setEditingCard(null); // Clear any existing editing card
    setIsAddingCard(true);
  };
  
  const handleSave = () => {
    setEditingCard(null);
    setIsAddingCard(false);
  };

  const handleCancel = () => {
    setEditingCard(null);
    setIsAddingCard(false);
  };
  
  const handleDeleteConfirm = (card: CardType) => {
    setCardToDelete(card);
  };

  const executeDelete = () => {
    if (cardToDelete) {
      deleteCard(cardToDelete.id);
      setCardToDelete(null);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => setCurrentView('deck-list')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
        </Button>
        <h2 className="text-2xl font-semibold">{t('editCards')} - {deck.name}</h2>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('addCard')}
        </Button>
      </div>

      {(isAddingCard || editingCard) && selectedDeckId && (
        <CardEditor
          card={editingCard}
          deckId={selectedDeckId}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('cards')} ({sortedCards.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedCards.length === 0 ? (
            <p className="text-muted-foreground">{t('noCardsInDeck')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">{t('front')}</TableHead>
                  <TableHead className="w-[25%]">{t('reading')}</TableHead>
                  <TableHead className="w-[30%]">{t('translation')}</TableHead>
                  <TableHead className="text-right w-[15%]">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium truncate max-w-xs">{card.front}</TableCell>
                    <TableCell className="truncate max-w-xs">{card.reading}</TableCell>
                    <TableCell className="truncate max-w-xs">{card.translation}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(card)} className="mr-2">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteConfirm(card)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={!!cardToDelete} onOpenChange={(open) => !open && setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteCard')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteCard')} "{cardToDelete?.front}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCardToDelete(null)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
