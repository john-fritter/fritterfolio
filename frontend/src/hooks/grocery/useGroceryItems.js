import { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/api';

export const useGroceryItems = (listId, updateListCount) => {
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [newItem, setNewItem] = useState('');
  const [isAdding, setIsAdding] = useState(false); // New state for add operation
  const [lastFetchedListId, setLastFetchedListId] = useState(null);

  // Debug log for state changes
  useEffect(() => {
    console.log('Items state changed:', { items, listId, itemsLoading });
  }, [items, listId, itemsLoading]);

  // Fetch items for a specific list
  const fetchItems = useCallback(async (force = false) => {
    if (!listId) {
      console.log('No listId provided, clearing items');
      setItems([]);
      setItemsLoading(false);
      setLastFetchedListId(null);
      return;
    }

    // Only fetch if forced, different list, or no items
    if (!force && lastFetchedListId === listId && items.length > 0) {
      console.log('Skipping fetch - already have items for list:', listId);
      return;
    }
  
    try {
      setItemsLoading(true);
      console.log("🔄 Fetching items for list:", listId);
  
      const fetchedItems = await api.getGroceryItems(listId);
      console.log("✅ Fetched items from API:", fetchedItems);
  
      const itemsArray = Array.isArray(fetchedItems) ? fetchedItems : [];
      setItems(itemsArray);
      setLastFetchedListId(listId);
      console.log("✅ Updated items state with:", itemsArray);
    } catch (error) {
      console.error("❌ Error fetching list items:", error);
      setItems([]);
      setLastFetchedListId(null);
    } finally {
      setItemsLoading(false);
    }
  }, [items.length, lastFetchedListId, listId]);

  // Effect to fetch items when listId changes
  useEffect(() => {
    console.log("🔄 List ID changed to:", listId);
    fetchItems(true);
  }, [listId, fetchItems]);

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