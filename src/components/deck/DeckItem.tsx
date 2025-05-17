
"use client";

import { useState } from 'react';
import type { Deck } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Edit3, Trash2, MoreVertical, BookOpen, Edit } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import RenameDeckDialog from './RenameDeckDialog'; // Placeholder for rename dialog

interface DeckItemProps {
  deck: Deck;
  cardCount: number;
}

export default function DeckItem({ deck, cardCount }: DeckItemProps) {
  const { setSelectedDeckId, setCurrentView, deleteDeck } = useApp();
  const { t } = useLanguage();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);

  const handleStudy = () => {
    setSelectedDeckId(deck.id);
    setCurrentView('study');
  };

  const handleEditCards = () => {
    setSelectedDeckId(deck.id);
    setCurrentView('edit-cards');
  };

  const handleDelete = () => {
    deleteDeck(deck.id);
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Card className="flex flex-col md:min-w-96">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl font-semibold">{deck.name}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsRenameDialogOpen(true)} className="cursor-pointer">
                  <Edit3 className="mr-2 h-4 w-4" />
                  {t('renameDeck')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('deleteDeck')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription>{t('deckDetails', { count: cardCount })}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          {/* Future: could show some stats like due cards */}
        </CardContent>
        <CardFooter className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={handleEditCards}>
            <Edit className="mr-2 h-4 w-4" />
            {t('manageCards')}
          </Button>
          <Button onClick={handleStudy}>
            <BookOpen className="mr-2 h-4 w-4" />
            {t('startStudying')}
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDeck')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteDeck')} "{deck.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <RenameDeckDialog 
        isOpen={isRenameDialogOpen} 
        onOpenChange={setIsRenameDialogOpen} 
        deck={deck} 
      />
    </>
  );
}
