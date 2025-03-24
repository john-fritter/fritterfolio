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
      console.log('No list ID provided, clearing items');
      setItems([]);
      setLastFetchedListId(null);
      return [];
    }

    // Skip fetch if we already have items for this list and not forcing
    const listIdToUse = targetListId || listId;
    
    if (!force && lastFetchedListId === listIdToUse && items.length > 0) {
      return items;
    }
  
    try {
      setItemsLoading(true);
      console.log('Fetching items for list:', listIdToUse);
      
      const rawResponse = await api.getGroceryItems(listIdToUse);
      console.log('Received response:', rawResponse);
      
      // Handle case where API returns null or undefined
      const fetchedItems = rawResponse || [];
      
      // Ensure we have a valid array even if API fails
      const itemsArray = Array.isArray(fetchedItems) ? fetchedItems : [];
      
      // Sort items alphabetically by name, case-insensitive
      const sortedItems = itemsArray.sort((a, b) => 
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );
      
      setItems(sortedItems);
      setLastFetchedListId(listIdToUse);
      return sortedItems;
    } catch (error) {
      console.error("Error fetching list items:", error);
      setItems([]);
      setLastFetchedListId(null);
      throw error; // Re-throw to allow proper error handling up the chain
    } finally {
      setItemsLoading(false);
    }
  }, [listId, lastFetchedListId, items]);

  // Effect to fetch items when listId changes
  useEffect(() => {
    if (!listId || itemsLoading) return;
    
    // Only fetch if list ID changed
    if (lastFetchedListId !== listId) {
      fetchItems(listId, false);
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
      throw new Error(`Failed to delete item: ${error.message}`);
    }
  };

  // Toggle item completion
  const toggleItem = async (itemId, completed) => {
    try {
      await api.updateGroceryItem(itemId, { completed, listId });
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
        api.updateGroceryItem(item.id, { completed, listId })
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
      const updatedItem = await api.updateGroceryItem(itemId, { ...updates, listId });
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