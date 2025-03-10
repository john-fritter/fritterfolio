import { useState, useCallback } from 'react';
import * as api from '../../services/api';

export const useGroceryItems = (listId, updateListCount) => {
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [newItem, setNewItem] = useState('');

  // Fetch items for a specific list
  const fetchItems = useCallback(async () => {
    if (!listId) return;
    
    try {
      setItemsLoading(true);
      const fetchedItems = await api.getGroceryItems(listId);
      setItems(fetchedItems);
    } catch (error) {
      console.error("Error fetching list items:", error);
    } finally {
      setItemsLoading(false);
    }
  }, [listId]);

  // Add a new item
  const addItem = async (name) => {
    if (!name.trim() || !listId) return;
    
    try {
      const newItemObj = await api.addGroceryItem(listId, name);
      setItems(prev => [...prev, newItemObj]);
      if (updateListCount) {
        updateListCount(listId, 1);
      }
      return newItemObj;
    } catch (error) {
      console.error("Error adding item:", error);
      throw error;
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