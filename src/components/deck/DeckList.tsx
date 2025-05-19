
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Merge } from 'lucide-react'; // Added Merge import
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import CreateDeckDialog from './CreateDeckDialog';
import MergeDecksDialog from './MergeDecksDialog'; // Added MergeDecksDialog import
import DeckItem from './DeckItem';

export default function DeckList() {
  const { decks, getCardsByDeckId } = useApp();
  const { t } = useLanguage();
  const [isCreateDeckOpen, setIsCreateDeckOpen] = useState(false);
  const [isMergeDecksOpen, setIsMergeDecksOpen] = useState(false); // State for merge dialog
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDecks = decks.filter(deck =>
    deck.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-semibold tracking-tight self-start sm:self-center">{t('decks')}</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            type="search"
            placeholder={t('searchDecksPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow sm:flex-grow-0 sm:w-64"
            aria-label={t('searchDecksPlaceholder')}
          />
          <Button 
            onClick={() => setIsMergeDecksOpen(true)} 
            variant="outline" 
            className="shrink-0"
            disabled={decks.length < 2}
            title={decks.length < 2 ? t('mergeDecksDisabledTooltip') : t('mergeDecks')}
          >
            <Merge className="mr-2 h-4 w-4" /> {t('mergeDecks')}
          </Button>
          <Button onClick={() => setIsCreateDeckOpen(true)} className="shrink-0">
            <PlusCircle className="mr-2 h-4 w-4" /> {t('newDeck')}
          </Button>
        </div>
      </div>

      {decks.length === 0 ? (
        <p className="text-muted-foreground">{t('noDecks')}</p>
      ) : filteredDecks.length === 0 ? (
        <p className="text-muted-foreground">{t('noDecksMatchSearch')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDecks.map((deck) => (
            <DeckItem key={deck.id} deck={deck} cardCount={getCardsByDeckId(deck.id).length} />
          ))}
        </div>
      )}

      <CreateDeckDialog isOpen={isCreateDeckOpen} onOpenChange={setIsCreateDeckOpen} />
      {decks.length >= 2 && (
        <MergeDecksDialog isOpen={isMergeDecksOpen} onOpenChange={setIsMergeDecksOpen} />
      )}
    </div>
  );
}
