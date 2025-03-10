import { useState, useCallback } from 'react';
import * as api from '../../services/api';

export const useGroceryLists = (user) => {
  const [groceryLists, setGroceryLists] = useState([]);
  const [currentList, setCurrentList] = useState(null);
  const [listsLoading, setListsLoading] = useState(true);
  const [newListName, setNewListName] = useState('');

  // Fetch all grocery lists
  const fetchGroceryLists = useCallback(async () => {
    if (!user) return;
    
    try {
      setListsLoading(true);
      const lists = await api.getGroceryLists();
      
      // Ensure each list has an items array
      const processedLists = lists.map(list => ({
        ...list,
        items: Array.isArray(list.items) ? list.items : []
      }));
      
      setGroceryLists(processedLists);
      
      // If no current list is selected but lists exist, select the first one
      if (!currentList && processedLists.length > 0) {
        setCurrentList(processedLists[0]);
      }
    } catch (error) {
      console.error("Error fetching grocery lists:", error);
    } finally {
      setListsLoading(false);
    }
  }, [user, currentList]);

  // Create a new list
  const createList = async (name) => {
    if (!name.trim() || !user) return;
    
    try {
      const newList = await api.createGroceryList(name);
      console.log('Created new list:', newList);
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
    } catch (error) {
      console.error("Error deleting list:", error);
      throw error;
    }
  };

  // Update list name
  const updateListName = async (listId, newName) => {
    try {
      await api.updateGroceryList(listId, { name: newName });
      
      setGroceryLists(prev => 
        prev.map(list => 
          list.id === listId ? { ...list, name: newName } : list
        )
      );
      
      if (currentList && currentList.id === listId) {
        setCurrentList(prev => ({ ...prev, name: newName }));
      }
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