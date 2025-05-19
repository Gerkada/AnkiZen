
"use client";

import { useState, useMemo } from 'react';
import type { Card as CardType } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useLanguage } from '@/contexts/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, PlusCircle, Edit2, Trash2, Bug, MoreVertical, Ban, RotateCcw, FilterX } from 'lucide-react'; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import CardEditor from './CardEditor';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { formatISO, parseISO, isBefore, startOfDay, addDays, isAfter, isSameDay } from 'date-fns';

const LEARNING_THRESHOLD_DAYS = 7; // Cards with interval <= this are "learning"

export default function EditCardsView() {
  const { 
    selectedDeckId, 
    getDeckById, 
    getCardsByDeckId, 
    setCurrentView,
    deleteCard,
    suspendCard,
    unsuspendCard,
  } = useApp();
  const { t } = useLanguage();

  const [editingCard, setEditingCard] = useState<CardType | null>(null); 
  const [isAddingCard, setIsAddingCard] = useState(false); 
  const [cardToDelete, setCardToDelete] = useState<CardType | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [tagsFilterInput, setTagsFilterInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const deck = useMemo(() => selectedDeckId ? getDeckById(selectedDeckId) : null, [selectedDeckId, getDeckById]);
  const allCardsInDeck = useMemo(() => selectedDeckId ? getCardsByDeckId(selectedDeckId) : [], [selectedDeckId, getCardsByDeckId]);
  
  const filteredAndSortedCards = useMemo(() => {
    let filtered = [...allCardsInDeck];
    const today = startOfDay(new Date());

    // Apply search term filter
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(card =>
        card.front.toLowerCase().includes(lowerSearchTerm) ||
        (card.reading && card.reading.toLowerCase().includes(lowerSearchTerm)) ||
        card.translation.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Apply tags filter
    const filterTagsArray = tagsFilterInput.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag);
    if (filterTagsArray.length > 0) {
      filtered = filtered.filter(card =>
        filterTagsArray.some(ft => (card.tags || []).map(ct => ct.toLowerCase()).includes(ft))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(card => {
        switch (statusFilter) {
          case 'new':
            return card.repetitions === 0 && !card.isSuspended;
          case 'due':
            return isBefore(parseISO(card.dueDate), addDays(today, 1)) && !card.isSuspended && !card.isLeech;
          case 'learning':
            return card.repetitions > 0 && card.interval <= LEARNING_THRESHOLD_DAYS && card.interval > 0 && !card.isSuspended;
          case 'learned':
            return card.interval > LEARNING_THRESHOLD_DAYS && !card.isSuspended;
          case 'suspended':
            return card.isSuspended === true;
          case 'leech':
            return card.isLeech === true && !card.isSuspended; // Show leeches that aren't also suspended by filter
          default:
            return true;
        }
      });
    }

    return filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [allCardsInDeck, searchTerm, tagsFilterInput, statusFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setTagsFilterInput('');
    setStatusFilter('all');
  };

  if (!deck) {
    return (
      <div className="text-center py-10">
        <p>{t('selectDeckToStudy')}</p> 
        <Button onClick={() => setCurrentView('deck-list')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
        </Button>
      </div>
    );
  }

  const handleEdit = (card: CardType) => {
    setEditingCard(card);
    setIsAddingCard(false); 
  };

  const handleAddNew = () => {
    setEditingCard(null); 
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

  const handleToggleSuspend = (card: CardType) => {
    if (card.isSuspended) {
      unsuspendCard(card.id);
    } else {
      suspendCard(card.id);
    }
  };
  
  const statusOptions = [
    { value: 'all', labelKey: 'statusAll' },
    { value: 'new', labelKey: 'statusNew' },
    { value: 'due', labelKey: 'statusDue' },
    { value: 'learning', labelKey: 'statusLearning' },
    { value: 'learned', labelKey: 'statusLearned' },
    { value: 'suspended', labelKey: 'statusSuspended' },
    { value: 'leech', labelKey: 'statusLeech' },
  ];

  const filtersApplied = searchTerm.trim() !== '' || tagsFilterInput.trim() !== '' || statusFilter !== 'all';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <Button variant="outline" onClick={() => setCurrentView('deck-list')} className="self-start sm:self-center">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('decks')}
        </Button>
        <h2 className="text-2xl font-semibold text-center sm:text-left flex-grow">{t('editCards')} - {deck.name}</h2>
        <Button onClick={handleAddNew} className="self-end sm:self-center">
          <PlusCircle className="mr-2 h-4 w-4" /> {t('addCard')}
        </Button>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>{t('filterCardsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <Label htmlFor="search-term">{t('searchCardContentLabel')}</Label>
              <Input
                id="search-term"
                placeholder={t('searchCardContentPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="tags-filter">{t('filterByTagsLabel')}</Label>
              <Input
                id="tags-filter"
                placeholder={t('filterByTagsPlaceholder')}
                value={tagsFilterInput}
                onChange={(e) => setTagsFilterInput(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status-filter">{t('filterByStatusLabel')}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder={t('filterByStatusPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
           {filtersApplied && (
             <Button variant="outline" onClick={clearFilters} size="sm">
               <FilterX className="mr-2 h-4 w-4" /> {t('clearFiltersButton')}
             </Button>
           )}
        </CardContent>
      </Card>


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
          <CardTitle>
            {t('cards')}{' '}
            ({filteredAndSortedCards.length}
            {filtersApplied ? ` ${t('cardsCountFilteredFrom', { total: allCardsInDeck.length })}` : ''})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allCardsInDeck.length === 0 ? (
             <p className="text-muted-foreground">{t('noCardsInDeck')}</p>
          ) : filteredAndSortedCards.length === 0 && filtersApplied ? (
            <p className="text-muted-foreground">{t('noCardsMatchFilters')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[25%]">{t('front')}</TableHead>
                  <TableHead className="w-[20%]">{t('reading')}</TableHead>
                  <TableHead className="w-[25%]">{t('translation')}</TableHead>
                  <TableHead className="w-[20%]">{t('tagsLabel')}</TableHead>
                  <TableHead className="text-right w-[10%]">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedCards.map((card) => (
                  <TableRow key={card.id} className={card.isSuspended ? 'opacity-50' : ''}>
                    <TableCell className="font-medium truncate max-w-xs flex items-center">
                       {card.isSuspended && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                               <Ban className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('suspendedCardTooltip')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {card.isLeech && !card.isSuspended && ( 
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Bug className="h-4 w-4 mr-2 text-destructive flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('leechIndicatorTooltip')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <span className="truncate">{card.front}</span>
                    </TableCell>
                    <TableCell className="truncate max-w-xs">{card.reading || '-'}</TableCell>
                    <TableCell className="truncate max-w-xs">{card.translation}</TableCell>
                    <TableCell className="truncate max-w-xs">
                      {(card.tags && card.tags.length > 0) ? 
                        card.tags.map(tag => <Badge key={tag} variant="secondary" className="mr-1 mb-1">{tag}</Badge>) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label={t('moreActions')}>
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(card)} className="cursor-pointer">
                                    <Edit2 className="mr-2 h-4 w-4" />
                                    {t('editCard')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleSuspend(card)} className="cursor-pointer">
                                    {card.isSuspended ? (
                                        <>
                                            <RotateCcw className="mr-2 h-4 w-4" />
                                            {t('unsuspendCard')}
                                        </>
                                    ) : (
                                        <>
                                            <Ban className="mr-2 h-4 w-4" />
                                            {t('suspendCard')}
                                        </>
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                    onClick={() => handleDeleteConfirm(card)} 
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t('deleteCard')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
              {t('confirmDeleteCard', { cardFront: cardToDelete?.front || '' })}
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

