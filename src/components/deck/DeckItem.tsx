
"use client";

import { useState, useRef, type ChangeEvent, useMemo } from 'react';
import type { Deck, Card as CardType, TestField } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Edit3, Trash2, MoreVertical, BookOpen, Edit, FileQuestion, Upload, Download, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import RenameDeckDialog from './RenameDeckDialog';
import { useToast } from '@/hooks/use-toast';

interface DeckItemProps {
  deck: Deck;
  cardCount: number;
}

const MIN_CARDS_FOR_TEST = 4;

export default function DeckItem({ deck, cardCount }: DeckItemProps) {
  const { 
    setSelectedDeckId, 
    setCurrentView, 
    deleteDeck, 
    importCardsToDeck, 
    getCardsByDeckId,
    setTestConfig,
    testConfig // Ensure testConfig is available if needed for logic here, though it's not used currently
  } = useApp();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const testableCardsCount = useMemo(() => {
    const cardsInDeck = getCardsByDeckId(deck.id);
    // A card is testable if it has content for at least two distinct fields among front, reading, translation
    return cardsInDeck.filter(card => {
      let populatedFields = 0;
      if (card.front?.trim()) populatedFields++;
      if (card.reading?.trim()) populatedFields++;
      if (card.translation?.trim()) populatedFields++;
      return populatedFields >= 2;
    }).length;
  }, [deck.id, getCardsByDeckId]);


  const handleStudy = () => {
    setSelectedDeckId(deck.id);
    setCurrentView('study');
  };

  const handleEditCards = () => {
    setSelectedDeckId(deck.id);
    setCurrentView('edit-cards');
  };

  const handleTest = (isMasteryTest = false) => {
    setTestConfig({ isMasteryTest });
    setSelectedDeckId(deck.id);
    setCurrentView('test');
  };

  const handleDelete = () => {
    deleteDeck(deck.id);
    setIsDeleteDialogOpen(false);
    toast({ title: t('successTitle'), description: t('deckDeletedMsg', { deckName: deck.name }) });
  };

  const handleImportWordsClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const fileContent = await file.text();
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');
        const parsedCardsData = lines.map(line => {
          const parts = line.split(',');
          return {
            front: parts[0]?.trim() || '',
            reading: parts[1]?.trim() || '',
            translation: parts[2]?.trim() || '',
          };
        }).filter(card => card.front);

        if (parsedCardsData.length > 0) {
          const result = importCardsToDeck(deck.id, parsedCardsData);
          if (result.newCount > 0 && result.skippedCount > 0) {
            toast({ title: t('successTitle'), description: t('importToDeckDuplicatesSkipped', { newCount: result.newCount, deckName: deck.name, skippedCount: result.skippedCount }) });
          } else if (result.newCount > 0) {
            toast({ title: t('successTitle'), description: t('importToDeckSuccess', { count: result.newCount, deckName: deck.name }) });
          } else {
            toast({ title: t('infoTitle') || 'Info', description: t('importToDeckNoNewCards', { deckName: deck.name }) });
          }
        } else {
          toast({ title: t('infoTitle') || 'Info', description: t('importToDeckNoNewCards', { deckName: deck.name }) });
        }
      } catch (error) {
        console.error("Error importing cards:", error);
        toast({ title: t('errorTitle'), description: t('fileReadError') || "Could not read file.", variant: "destructive" });
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportDeck = () => {
    const cardsToExport = getCardsByDeckId(deck.id);
    const headers = "Front,Reading,Translation";
    const csvRows = cardsToExport.map(card =>
      `"${card.front.replace(/"/g, '""')}","${(card.reading || '').replace(/"/g, '""')}","${card.translation.replace(/"/g, '""')}"`
    );
    const csvContent = [headers, ...csvRows].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${deck.name.replace(/[^a-z0-9]/gi, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: t('successTitle'), description: t('deckExportedSuccess', { deckName: deck.name }) });
  };

  const canTakeTest = testableCardsCount >= MIN_CARDS_FOR_TEST;

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".csv,.txt"
        onChange={handleFileSelected}
      />
      <Card
        className="group relative flex flex-col cursor-pointer transition-transform transition-shadow duration-200 ease-in-out hover:shadow-xl hover:scale-105 hover:z-10 focus-within:shadow-xl focus-within:scale-105 focus-within:z-10"
        tabIndex={0}
      >
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl font-semibold">{deck.name}</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={handleImportWordsClick} className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  {t('importWords')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportDeck} className="cursor-pointer">
                  <Download className="mr-2 h-4 w-4" />
                  {t('exportDeck')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsRenameDialogOpen(true)} className="cursor-pointer">
                  <Edit3 className="mr-2 h-4 w-4" />
                  {t('renameDeck')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                 <DropdownMenuItem 
                  onClick={() => handleTest(true)} 
                  disabled={!canTakeTest}
                  className="cursor-pointer"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t('masteryChallenge')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('deleteDeck')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <CardDescription>{t('deckDetails', { count: cardCount })}</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow px-6 py-2">
          {/* Future: could show some stats like due cards */}
        </CardContent>
        <CardFooter className="hidden group-hover:flex group-focus-within:flex flex-wrap justify-end gap-2 mt-auto p-6 pt-0">
          <Button variant="outline" size="sm" onClick={handleEditCards}>
            <Edit className="mr-2 h-4 w-4" />
            {t('manageCards')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleTest(false)} disabled={!canTakeTest}>
            <FileQuestion className="mr-2 h-4 w-4" />
            {t('takeTest')}
          </Button>
          <Button size="sm" onClick={handleStudy}>
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

