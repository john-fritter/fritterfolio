import { useState, useCallback } from 'react';
import * as api from '../../services/api';

export const useMasterList = (user) => {
  const [masterList, setMasterList] = useState({ items: [] });
  const [masterLoading, setMasterLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);

  // Fetch master list items
  const fetchMasterList = useCallback(async () => {
    if (!user) return { items: [] };
    
    try {
      setMasterLoading(true);
      
      const rawResponse = await api.getMasterList();      
      // Handle case where API returns null or undefined
      const masterListData = rawResponse || { items: [] };
      
      // Important: Don't proceed if response doesn't have items array
      if (!masterListData || !Array.isArray(masterListData.items)) {
        console.error("Invalid master list data:", masterListData);
        // Create a valid data structure
        const emptyList = { items: [] };
        setMasterList(emptyList);
        setMasterLoading(false);
        return emptyList;
      }
      
      // Deduplicate items by name (case-insensitive)
      const seen = new Set();
      const deduplicatedItems = masterListData.items.filter(item => {
        if (!item || !item.name) return false; // Skip invalid items
        
        const normalizedName = item.name.toLowerCase().trim();
        if (seen.has(normalizedName)) {
          return false;
        }
        seen.add(normalizedName);
        return true;
      });
      
      // Create new master list object with deduplicated items
      const updatedMasterList = {
        ...masterListData,
        items: deduplicatedItems
      };
      
      setMasterList(updatedMasterList);
      setMasterLoading(false);
      
      return updatedMasterList;
    } catch (error) {
      console.error("Error fetching master list:", error);
      const emptyList = { items: [] };
      setMasterList(emptyList);
      setMasterLoading(false);
      return emptyList;
    }
  }, [user]);

  // Add item to master list
  const addToMasterList = async (itemName, tags = []) => {
    if (!user || !itemName.trim()) return;
    
    try {
      // Check if item already exists (case insensitive)
      const normalizedName = itemName.toLowerCase().trim();
      
      // More robust duplicate check - keep a local cache of recently added items to prevent UI duplication
      const isDuplicateInUI = masterList.items.some(item => 
        item.name.toLowerCase().trim() === normalizedName
      );
      
      // If it exists in the current UI state, don't add it again
      if (isDuplicateInUI) {
        const existingItem = masterList.items.find(item => 
          item.name.toLowerCase().trim() === normalizedName
        );
        
        // If the item exists and has different tags, update them
        if (tags?.length > 0 && JSON.stringify(existingItem.tags) !== JSON.stringify(tags)) {
          return updateMasterItem(existingItem.id, { name: existingItem.name, tags });
        }
        
        return existingItem;
      }
      
      // Add the new item with optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticItem = {
        id: tempId,
        name: itemName.trim(),
        completed: false,
        created_at: new Date().toISOString(),
        tags: tags || []
      };
      
      // Update UI immediately (optimistic update)
      setMasterList(prev => ({
        ...prev,
        items: [...prev.items, optimisticItem]
      }));
      
      // Make the API call
      const newMasterItem = await api.addMasterListItem(itemName, tags);
      
      // Replace the optimistic item with the real one
      setMasterList(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.id === tempId ? newMasterItem : item
        )
      }));
      
      return newMasterItem;
    } catch (error) {
      console.error("Error adding to master list:", error);
      throw error;
    }
  };

  // Update master item
  const updateMasterItem = async (itemId, updates) => {
    console.log("updateMasterItem called with:", { itemId, updates });
    
    // Check if the item exists in the local state
    const originalItem = masterList.items.find(item => item.id === itemId);
    
    // Check if the itemId is a temporary ID
    if (typeof itemId === 'string' && itemId.startsWith('temp-')) {
      console.error(`Cannot update master item with temporary ID: ${itemId}`);
      throw new Error(`Cannot update master item that is still being created: ${itemId}`);
    }
    
    try {
      console.log("Calling API to update master item:", itemId);
      const updatedItem = await api.updateMasterListItem(itemId, updates);
      console.log("API call successful, updating UI with:", updatedItem);
      
      // If the item was not in the local state, add it
      if (!originalItem) {
        console.log("Item was not in local state, adding it now");
        setMasterList(prev => ({
          ...prev,
          items: [...prev.items, updatedItem]
        }));
      } else {
        // Otherwise, update the existing item
        setMasterList(prev => ({
          ...prev,
          items: prev.items.map(item => 
            item.id === itemId ? updatedItem : item
          )
        }));
      }
      
      return updatedItem;
    } catch (error) {
      console.error("Error updating master item:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        itemId,
        updates
      });
      throw error;
    }
  };

  // Delete item from master list
  const deleteMasterItem = async (itemId) => {
    try {
      await api.deleteMasterListItem(itemId);
      setMasterList(prev => ({
        ...prev,
        items: prev.items.filter(item => item.id !== itemId)
      }));
    } catch (error) {
      console.error("Error deleting master item:", error);
      // Show an alert to the user
      alert(`Error deleting item: ${error.message}`);
      throw error;
    }
  };

  // Toggle master item completion
  const toggleMasterItem = async (itemId, completed) => {
    try {
      // Optimistically update the UI immediately
      setMasterList(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.id === itemId ? { ...item, completed } : item
        )
      }));
      
      // Make the API call in the background
      await api.updateMasterListItem(itemId, { completed });
    } catch (error) {
      console.error("Error toggling master item:", error);
      // Revert the optimistic update on error
      setMasterList(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.id === itemId ? { ...item, completed: !completed } : item
        )
      }));
      // Show an alert to the user
      alert(`Error updating item: ${error.message}`);
      throw error;
    }
  };

  // Toggle all master items
  const toggleAllMasterItems = async (completed) => {
    try {
      // Optimistically update the UI immediately
      setMasterList(prev => ({
        ...prev,
        items: prev.items.map(item => ({ ...item, completed }))
      }));
      
      // Make the API calls in the background
      const updatePromises = masterList.items.map(item => 
        api.updateMasterListItem(item.id, { completed })
      );
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error("Error toggling all master items:", error);
      // Revert the optimistic update on error
      setMasterList(prev => ({
        ...prev,
        items: prev.items.map(item => ({ ...item, completed: !completed }))
      }));
      // Show an alert to the user
      alert(`Error updating items: ${error.message}`);
      throw error;
    }
  };

  return {
    masterList,
    masterLoading,
    selectedItems,
    setSelectedItems,
    fetchMasterList,
    addToMasterList,
    deleteMasterItem,
    toggleMasterItem,
    toggleAllMasterItems,
    updateMasterItem
  };
}; 