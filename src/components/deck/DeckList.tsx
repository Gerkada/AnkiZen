"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import CreateDeckDialog from './CreateDeckDialog';
import DeckItem from './DeckItem';

export default function DeckList() {
  const { decks, getCardsByDeckId } = useApp();
  const { t } = useLanguage();
  const [isCreateDeckOpen, setIsCreateDeckOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold tracking-tight">{t('decks')}</h2>
        <Button onClick={() => setIsCreateDeckOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> {t('newDeck')}
        </Button>
      </div>

      {decks.length === 0 ? (
        <p className="text-muted-foreground">{t('noDecks')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <DeckItem key={deck.id} deck={deck} cardCount={getCardsByDeckId(deck.id).length} />
          ))}
        </div>
      )}

      <CreateDeckDialog isOpen={isCreateDeckOpen} onOpenChange={setIsCreateDeckOpen} />
    </div>
  );
}
