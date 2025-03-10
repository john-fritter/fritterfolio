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
      
      // Make sure every list has an items array, even if empty
      const listsWithItems = lists.map(list => ({
        ...list,
        items: list.items || []
      }));
      
      setGroceryLists(listsWithItems);
      
      // If no current list is selected but lists exist, select the first one
      if (!currentList && listsWithItems.length > 0) {
        setCurrentList(listsWithItems[0]);
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
      setCurrentList({ ...newList, items: [] });
      setGroceryLists(prev => [newList, ...prev]);
      return newList;
    } catch (error) {
      console.error("Error creating new list:", error);
      throw error;
    }
  };

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
    updateListName
  };
}; 