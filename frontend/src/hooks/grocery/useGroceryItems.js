import { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';

export const useGroceryItems = (listId, updateListCount) => {
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [lastFetchedListId, setLastFetchedListId] = useState(null);

  // Fetch items for a specific list
  const fetchItems = useCallback(async (force = false) => {
    if (!listId) {
      setItems([]);
      setLastFetchedListId(null);
      return;
    }

    // Skip if not forced and we already have items for this list
    if (!force && lastFetchedListId === listId) {
      return;
    }
  
    try {
      setItemsLoading(true);
      const fetchedItems = await api.getGroceryItems(listId);
      const itemsArray = Array.isArray(fetchedItems) ? fetchedItems : [];
      setItems(itemsArray);
      setLastFetchedListId(listId);
    } catch (error) {
      console.error("Error fetching list items:", error);
      setItems([]);
      setLastFetchedListId(null);
    } finally {
      setItemsLoading(false);
    }
  }, [listId, lastFetchedListId]);

  // Effect to fetch items when listId changes
  useEffect(() => {
    if (listId !== lastFetchedListId) {
      fetchItems();
    }
  }, [listId, lastFetchedListId, fetchItems]);

  // Add a new item with debounce protection
  const addItem = async (name) => {
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