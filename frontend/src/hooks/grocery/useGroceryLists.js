import { useState, useCallback, useMemo } from 'react';
import * as api from '../../services/api';

export const useGroceryLists = (user) => {
  const [groceryLists, setGroceryLists] = useState([]);
  const [currentList, setCurrentList] = useState(null);
  const [listsLoading, setListsLoading] = useState(false);
  const [newListName, setNewListName] = useState('');
  
  // Memoized version of the lists to stabilize renders
  const memoizedLists = useMemo(() => groceryLists, [groceryLists]);

  // Fetch all grocery lists with improved state handling
  const fetchGroceryLists = useCallback(async (force = false) => {
    if (!user) return [];

    // Only use cache for very rapid repeated calls
    // Always fetch fresh data after operations like list deletion or sharing
    
    try {
      // Only show loading if we don't have any lists yet or forcing a refresh
      if (memoizedLists.length === 0 || force) {
        setListsLoading(true);
      }
      
      const lists = await api.getGroceryLists();
      const processedLists = lists.map(list => ({
        ...list,
        items: Array.isArray(list.items) ? list.items : [],
      }));
      
      // Only update state if lists actually changed (by ID)
      const currentIds = new Set(memoizedLists.map(list => list.id));
      const newIds = new Set(processedLists.map(list => list.id));
      
      // Check if the lists have actually changed
      const listsChanged = 
        memoizedLists.length !== processedLists.length || 
        processedLists.some(list => !currentIds.has(list.id)) ||
        memoizedLists.some(list => !newIds.has(list.id));
      
      if (listsChanged) {
        setGroceryLists(processedLists);
      }
      
      return processedLists;
    } catch (error) {
      console.error("Error fetching grocery lists:", error);
      return memoizedLists.length > 0 ? memoizedLists : [];
    } finally {
      setListsLoading(false);
    }
  }, [user, memoizedLists]);
  
  

  // Create a new list
  const createList = async (name) => {
    if (!name.trim() || !user) return;
    
    try {
      const newList = await api.createGroceryList(name);
      const listWithItems = { ...newList, items: [] };
      setCurrentList(listWithItems);
      setGroceryLists(prev => [listWithItems, ...prev]);
      return listWithItems;
    } catch (error) {
      console.error("Error creating new list:", error);
      throw error;
    }
  };

  // Update list items count
  const updateListItemsCount = useCallback((listId, delta) => {
    console.log(`Updating count for list ${listId} by ${delta}`);
    setGroceryLists(prev => {
      const updated = prev.map(list => {
        if (list.id === listId) {
          const items = Array.isArray(list.items) ? list.items : [];
          const currentCount = items.length;
          console.log(`Current count: ${currentCount}, New count: ${currentCount + delta}`);
          
          if (delta > 0) {
            // Adding items - extend the array
            return { 
              ...list, 
              items: [...items, ...Array(delta).fill(null)]
            };
          } else {
            // Removing items - shrink the array
            return { 
              ...list, 
              items: items.slice(0, Math.max(0, currentCount + delta))
            };
          }
        }
        return list;
      });
      console.log('Updated lists:', updated);
      return updated;
    });
    
    if (currentList?.id === listId) {
      setCurrentList(prev => {
        const items = Array.isArray(prev.items) ? prev.items : [];
        const currentCount = items.length;
        const newCount = Math.max(0, currentCount + delta);
        
        if (delta > 0) {
          return { 
            ...prev, 
            items: [...items, ...Array(delta).fill(null)]
          };
        } else {
          return { 
            ...prev, 
            items: items.slice(0, newCount)
          };
        }
      });
    }
  }, [currentList]);

  // Delete a list
  const deleteList = async (listId) => {
    try {
      await api.deleteGroceryList(listId);
      
      setGroceryLists(prev => prev.filter(list => list.id !== listId));
      
      if (currentList && currentList.id === listId) {
        const remainingLists = groceryLists.filter(list => list.id !== listId);
        if (remainingLists.length > 0) {
          setCurrentList(remainingLists[0]);
        } else {
          setCurrentList(null);
        }
      }
      
      // Return success for promise chaining
      return { success: true };
    } catch (error) {
      console.error("Error deleting list:", error);
      throw error;
    }
  };

  // Update list name
  const updateListName = async (listId, newName) => {
    try {
      await api.updateGroceryList(listId, { name: newName });
      
      // Update the list in groceryLists
      setGroceryLists(prev => 
        prev.map(list => 
          list.id === listId ? { ...list, name: newName } : list
        )
      );
      
      // Update currentList if it matches
      if (currentList && currentList.id === listId) {
        setCurrentList(prev => ({ ...prev, name: newName }));
      }

      // Force refresh lists to ensure UI is up to date
      await fetchGroceryLists(true);
      
      return true;
    } catch (error) {
      console.error("Error updating list name:", error);
      throw error;
    }
  };

  return {
    groceryLists,
    currentList,
    listsLoading,
    newListName,
    setNewListName,
    setCurrentList,
    fetchGroceryLists,
    createList,
    deleteList,
    updateListName,
    updateListItemsCount
  };
}; 