import { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';

export const useGroceryItems = (listId, updateListCount) => {
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [lastFetchedListId, setLastFetchedListId] = useState(null);

  // Fetch items for a specific list
  const fetchItems = useCallback(async (targetListId = listId, force = false) => {
    // If no ID provided and no current listId, clear items
    if (!targetListId) {
      setItems([]);
      setLastFetchedListId(null);
      return;
    }

    // Skip fetch if we already have items for this list and not forcing
    const listIdToUse = targetListId || listId;
    
    if (!force && lastFetchedListId === listIdToUse && items.length > 0) {
      console.log('Skipping items fetch - already loaded for list:', listIdToUse);
      return items;
    }
  
    try {
      console.log('Fetching items for list:', listIdToUse);
      setItemsLoading(true);
      const fetchedItems = await api.getGroceryItems(listIdToUse);
      const itemsArray = Array.isArray(fetchedItems) ? fetchedItems : [];
      setItems(itemsArray);
      setLastFetchedListId(listIdToUse);
      return itemsArray;
    } catch (error) {
      console.error("Error fetching list items:", error);
      setItems([]);
      setLastFetchedListId(null);
      return [];
    } finally {
      setItemsLoading(false);
    }
  }, [listId, lastFetchedListId, items]);

  // Effect to fetch items when listId changes
  useEffect(() => {
    // Only fetch when listId exists, has changed, and we're not already loading
    if (listId && !itemsLoading) {
      // We need to handle three cases:
      // 1. Initial load (lastFetchedListId is null)
      // 2. List ID changed to a different list
      // 3. We already fetched this list and should skip
      
      if (lastFetchedListId === null) {
        // Initial load - fetch with no force flag
        console.log('Initial fetch for list:', listId);
        fetchItems(listId, false);
      } else if (lastFetchedListId !== listId) {
        // List ID changed - fetch the new list
        console.log('List ID changed, fetching new list:', listId);
        fetchItems(listId, false);
      } else {
        // Same list ID, already fetched - skip to prevent flickering
        console.log('Skipping duplicate fetch for same list:', listId);
      }
    }
  }, [listId, lastFetchedListId, fetchItems, itemsLoading]);

  // Add a new item with debounce protection
  const addItem = async (name, addToMasterListFn = null) => {
    if (!name.trim() || !listId || isAdding) return;
    
    try {
      setIsAdding(true);
      // Check for duplicates case-insensitively
      const isDuplicate = items.some(item => 
        item.name.toLowerCase() === name.trim().toLowerCase()
      );
      
      if (isDuplicate) {
        throw new Error('This item is already in your list');
      }
      
      const newItemObj = await api.addGroceryItem(listId, name);
      setItems(prev => [...prev, newItemObj]);
      if (updateListCount) {
        updateListCount(listId, 1);
      }
      
      // Also add to master list if a function is provided
      if (addToMasterListFn && typeof addToMasterListFn === 'function') {
        try {
          await addToMasterListFn(name);
        } catch (error) {
          console.error("Error adding to master list:", error);
          // Don't fail the whole operation if master list add fails
        }
      }
      
      return newItemObj;
    } catch (error) {
      console.error("Error adding item:", error);
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  // Delete an item
  const deleteItem = async (itemId) => {
    try {
      await api.deleteGroceryItem(itemId);
      setItems(prev => prev.filter(item => item.id !== itemId));
      if (updateListCount) {
        updateListCount(listId, -1);
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      throw error;
    }
  };

  // Toggle item completion
  const toggleItem = async (itemId, completed) => {
    try {
      await api.updateGroceryItem(itemId, { completed });
      setItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, completed } : item
        )
      );
    } catch (error) {
      console.error("Error toggling item:", error);
      throw error;
    }
  };

  // Toggle all items
  const toggleAllItems = async (completed) => {
    try {
      const updatePromises = items.map(item => 
        api.updateGroceryItem(item.id, { completed })
      );
      
      await Promise.all(updatePromises);
      
      setItems(prev => 
        prev.map(item => ({ ...item, completed }))
      );
    } catch (error) {
      console.error("Error toggling all items:", error);
      throw error;
    }
  };

  // Update item
  const updateItem = async (itemId, updates) => {
    try {
      const updatedItem = await api.updateGroceryItem(itemId, updates);
      setItems(prev => 
        prev.map(item => 
          item.id === itemId ? updatedItem : item
        )
      );
      return updatedItem;
    } catch (error) {
      console.error("Error updating item:", error);
      throw error;
    }
  };

  return {
    items,
    itemsLoading,
    isAdding,
    newItem,
    setNewItem,
    fetchItems,
    addItem,
    deleteItem,
    toggleItem,
    toggleAllItems,
    updateItem
  };
}; 