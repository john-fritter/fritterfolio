import { useState, useCallback } from 'react';
import * as api from '../../services/api';

export const useMasterList = (user) => {
  const [masterList, setMasterList] = useState({ items: [] });
  const [masterLoading, setMasterLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);

  // Fetch master list items
  const fetchMasterList = useCallback(async (force = false) => {
    if (!user) return;
    
    // Skip if we already have items and not forced
    if (!force && masterList.items.length > 0) {
      return masterList;
    }
    
    try {
      setMasterLoading(true);
      const masterListData = await api.getMasterList();
      
      // Deduplicate items by name (case-insensitive)
      const seen = new Set();
      const deduplicatedItems = masterListData.items.filter(item => {
        const normalizedName = item.name.toLowerCase().trim();
        if (seen.has(normalizedName)) {
          return false;
        }
        seen.add(normalizedName);
        return true;
      });
      
      setMasterList({
        ...masterListData,
        items: deduplicatedItems
      });
      
      return {
        ...masterListData,
        items: deduplicatedItems
      };
    } catch (error) {
      console.error("Error fetching master list:", error);
    } finally {
      setMasterLoading(false);
    }
  }, [user, masterList]);

  // Add item to master list
  const addToMasterList = async (itemName) => {
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
        return masterList.items.find(item => 
          item.name.toLowerCase().trim() === normalizedName
        );
      }
      
      // Add the new item with optimistic update
      const tempId = `temp-${Date.now()}`;
      const optimisticItem = {
        id: tempId,
        name: itemName.trim(),
        completed: false,
        created_at: new Date().toISOString()
      };
      
      // Update UI immediately (optimistic update)
      setMasterList(prev => ({
        ...prev,
        items: [...prev.items, optimisticItem]
      }));
      
      // Make the API call
      const newMasterItem = await api.addMasterListItem(itemName);
      
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
      throw error;
    }
  };

  // Toggle master item completion
  const toggleMasterItem = async (itemId, completed) => {
    try {
      await api.updateMasterListItem(itemId, { completed });
      setMasterList(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.id === itemId ? { ...item, completed } : item
        )
      }));
    } catch (error) {
      console.error("Error toggling master item:", error);
      throw error;
    }
  };

  // Toggle all master items
  const toggleAllMasterItems = async (completed) => {
    try {
      const updatePromises = masterList.items.map(item => 
        api.updateMasterListItem(item.id, { completed })
      );
      
      await Promise.all(updatePromises);
      
      setMasterList(prev => ({
        ...prev,
        items: prev.items.map(item => ({ ...item, completed }))
      }));
    } catch (error) {
      console.error("Error toggling all master items:", error);
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
    toggleAllMasterItems
  };
}; 