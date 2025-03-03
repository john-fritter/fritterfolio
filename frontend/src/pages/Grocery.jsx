import { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../services/api';
import { useAuth } from '../context/useAuth';
import { useNavigate } from 'react-router-dom';

// Views enum
const VIEWS = {
  LIST: 'list',
  MASTER: 'master',
  LISTS: 'lists'
};

export default function Grocery() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [groceryLists, setGroceryLists] = useState([]);
  const [currentList, setCurrentList] = useState(null);
  const [masterList, setMasterList] = useState({ items: [] });
  const [newListName, setNewListName] = useState('Groceries');
  const [newItem, setNewItem] = useState('');
  const [view, setView] = useState(VIEWS.LIST);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const currentItemRef = useRef(null);
  const longPressTimer = useRef(null);
  const longPressThreshold = 500; // ms
  const [selectedItems, setSelectedItems] = useState([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [targetListId, setTargetListId] = useState(null);
  const [showListSelection, setShowListSelection] = useState(false);

  // Check for mobile screen size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (loading) return; // Wait for loading to finish

    if (!user) {
      // If not logged in, redirect to login
      sessionStorage.setItem('loginRedirect', window.location.pathname);
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Memoize callback functions to avoid dependency loops
  const createUserIfNeeded = useCallback(async (user) => {
    if (!user || !user.id) return; // Add check for user.id
    
    try {
      await fetch(`${api.API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: user.id, // Make sure we're sending a proper ID
          email: user.email 
        })
      });
    } catch (error) {
      console.error("Error ensuring user exists:", error);
    }
  }, []);

  const fetchListItems = useCallback(async (listId) => {
    try {
      const items = await api.getGroceryItems(listId);
      setCurrentList(prev => ({ ...prev, items }));
    } catch (error) {
      console.error("Error fetching list items:", error);
    }
  }, []);

  const fetchGroceryLists = useCallback(async () => {
    if (!user) return;
    
    try {
      const lists = await api.getGroceryLists(user.uid);
      setGroceryLists(lists);
      
      if (!currentList && lists.length > 0) {
        setCurrentList(lists[0]);
        fetchListItems(lists[0].id);
      }
      
      if (lists.length === 0) {
        setView(VIEWS.LISTS);
      }
    } catch (error) {
      console.error("Error fetching grocery lists:", error);
    }
  }, [user, currentList, fetchListItems]);

  const fetchMasterList = useCallback(async () => {
    if (!user) return;
    
    try {
      const masterList = await api.getMasterList(user.uid);
      
      // Deduplicate items by name (case-insensitive)
      const seen = new Set();
      const deduplicatedItems = masterList.items.filter(item => {
        const normalizedName = item.name.toLowerCase().trim();
        if (seen.has(normalizedName)) {
          return false;
        }
        seen.add(normalizedName);
        return true;
      });
      
      setMasterList({
        ...masterList,
        items: deduplicatedItems
      });
    } catch (error) {
      console.error("Error fetching master list:", error);
    }
  }, [user]);

  // Fetch data when component loads
  useEffect(() => {
    if (user) {
      createUserIfNeeded(user);
      fetchGroceryLists();
      fetchMasterList();
    }
  }, [user, createUserIfNeeded, fetchGroceryLists, fetchMasterList]);

  // Create a new grocery list
  const createNewList = async (e) => {
    e.preventDefault();
    if (!newListName.trim() || !user) return;
    
    try {
      const newList = await api.createGroceryList(newListName, user.uid);
      
      setCurrentList({ ...newList, items: [] });
      setGroceryLists(prev => [newList, ...prev]);
      
      setNewListName('Groceries');
      setView(VIEWS.LIST);
    } catch (error) {
      console.error("Error creating list:", error);
    }
  };

  // Add item to current list and master list
  const addItem = async (e) => {
    e?.preventDefault();
    if (!newItem.trim()) return;
    
    try {
      // Add to current list if in list view
      if (view === VIEWS.LIST && currentList) {
        const newItemObj = await api.addGroceryItem(currentList.id, newItem);
        
        setCurrentList(prev => ({
          ...prev,
          items: [...prev.items, newItemObj]
        }));
        
        // Also add to master list
        await addToMasterList(newItem);
      } else if (view === VIEWS.MASTER) {
        // Only add to master list
        await addToMasterList(newItem);
      }
      
      setNewItem('');
      setEditingItem(null);
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  // Toggle item completion status
  const toggleItem = async (itemIndex) => {
    try {
      if (view === VIEWS.LIST) {
        const item = currentList.items[itemIndex];
        const updatedItem = await api.updateGroceryItem(item.id, { completed: !item.completed });
        
        // Update the item in the current list
        setCurrentList(prev => {
          const updatedItems = [...prev.items];
          updatedItems[itemIndex] = updatedItem;
          return { ...prev, items: updatedItems };
        });
      } else if (view === VIEWS.MASTER) {
        // We would need a similar endpoint for master list items
        // For now, let's just update the UI
        setMasterList(prev => {
          const updatedItems = [...prev.items];
          updatedItems[itemIndex].completed = !updatedItems[itemIndex].completed;
          return { ...prev, items: updatedItems };
        });
      }
    } catch (error) {
      console.error("Error toggling item:", error);
    }
  };

  // Delete item
  const deleteItem = async (itemIndex) => {
    try {
      if (view === VIEWS.LIST) {
        const item = currentList.items[itemIndex];
        await api.deleteGroceryItem(item.id);
        
        // Update the current list
        setCurrentList(prev => {
          const updatedItems = prev.items.filter((_, index) => index !== itemIndex);
          return { ...prev, items: updatedItems };
        });
      } else if (view === VIEWS.MASTER) {
        // We would need a similar endpoint for master list items
        // For now, let's just update the UI
        setMasterList(prev => {
          const updatedItems = prev.items.filter((_, index) => index !== itemIndex);
          return { ...prev, items: updatedItems };
        });
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  // Clear bought items
  const clearBoughtItems = async () => {
    try {
      if (view === VIEWS.LIST && currentList) {
        // This would require a new backend endpoint - for now, let's handle it client-side
        const itemsToKeep = currentList.items.filter(item => !item.completed);
        
        // Delete each completed item
        const deletePromises = currentList.items
          .filter(item => item.completed)
          .map(item => api.deleteGroceryItem(item.id));
          
        await Promise.all(deletePromises);
        
        // Update the current list
        setCurrentList(prev => ({ ...prev, items: itemsToKeep }));
      } else if (view === VIEWS.MASTER) {
        // Similar for master list
        const itemsToKeep = masterList.items.filter(item => !item.completed);
        setMasterList(prev => ({ ...prev, items: itemsToKeep }));
      }
      setMenuOpen(false);
    } catch (error) {
      console.error("Error clearing bought items:", error);
    }
  };

  // Delete current list
  const deleteCurrentList = async () => {
    try {
      if (currentList) {
        // We would need to add this endpoint
        await fetch(`${api.API_URL}/grocery-lists/${currentList.id}`, {
          method: 'DELETE'
        });
        
        // Update lists and reset current list
        setGroceryLists(prev => prev.filter(list => list.id !== currentList.id));
        setCurrentList(null);
        setView(VIEWS.LISTS);
      }
      setMenuOpen(false);
    } catch (error) {
      console.error("Error deleting list:", error);
    }
  };

  // Select a list to view
  const selectList = (list) => {
    setCurrentList(list);
    fetchListItems(list.id);
    setView(VIEWS.LIST); // This explicitly changes the view
  };

  // Add item from master list to current list
  const addFromMasterToCurrentList = async (item) => {
    if (!currentList) return;
    
    try {
      const newItem = await api.addGroceryItem(currentList.id, item.name);
      
      // Update current list
      setCurrentList(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));
    } catch (error) {
      console.error("Error adding from master list:", error);
    }
  };

  // Handle swipe start
  const handleTouchStart = (e, itemIndex) => {
    touchStartX.current = e.touches[0].clientX;
    currentItemRef.current = itemIndex;
    
    // Setup long press timer
    longPressTimer.current = setTimeout(() => {
      if (isMobile) {
        const item = view === VIEWS.LIST ? currentList.items[itemIndex] : masterList.items[itemIndex];
        setEditingItem({ index: itemIndex, name: item.name });
        setNewItem(item.name);
      }
      longPressTimer.current = null;
    }, longPressThreshold);
  };

  // Handle swipe move
  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Handle swipe end
  const handleTouchEnd = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchEndX.current - touchStartX.current;
    
    if (diff > 50) { // Swipe right - mark as completed
      toggleItem(currentItemRef.current);
    } else if (diff < -50) { // Swipe left - delete
      deleteItem(currentItemRef.current);
    }
    
    currentItemRef.current = null;
  };

  // Handle item click (for desktop)
  const handleItemClick = (itemIndex) => {
    if (!isMobile) {
      const item = view === VIEWS.LIST ? currentList.items[itemIndex] : masterList.items[itemIndex];
      setEditingItem({ index: itemIndex, name: item.name });
      setNewItem(item.name);
    }
  };

  // Update item
  const updateItem = async () => {
    if (!editingItem || !newItem.trim()) return;
    
    try {
      if (view === VIEWS.LIST) {
        const item = currentList.items[editingItem.index];
        const updatedItem = await api.updateGroceryItem(item.id, { name: newItem });
        
        // Update the item in the current list
        setCurrentList(prev => {
          const updatedItems = [...prev.items];
          updatedItems[editingItem.index] = updatedItem;
          return { ...prev, items: updatedItems };
        });
        
        // Also update in master list if it exists there
        const masterItemIndex = masterList.items.findIndex(
          item => item.name.toLowerCase() === editingItem.name.toLowerCase()
        );
        
        if (masterItemIndex !== -1) {
          const masterItem = masterList.items[masterItemIndex];
          const updatedMasterItem = await api.updateMasterListItem(masterItem.id, { name: newItem });
          
          setMasterList(prev => {
            const updatedItems = [...prev.items];
            updatedItems[masterItemIndex] = updatedMasterItem;
            return { ...prev, items: updatedItems };
          });
        }
      } else if (view === VIEWS.MASTER) {
        const item = masterList.items[editingItem.index];
        const updatedItem = await api.updateMasterListItem(item.id, { name: newItem });
        
        setMasterList(prev => {
          const updatedItems = [...prev.items];
          updatedItems[editingItem.index] = updatedItem;
          return { ...prev, items: updatedItems };
        });
      }
      
      setEditingItem(null);
      setNewItem('');
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  // Add this function to clear input after adding item
  const handleAddItem = async (e) => {
    e?.preventDefault();
    if (!newItem.trim()) return;
    
    await addItem(e);
    // Clear the input field immediately after adding
    setNewItem('');
  };

  // Add these new functions
  const toggleItemSelection = (index) => {
    if (selectedItems.includes(index)) {
      setSelectedItems(selectedItems.filter(i => i !== index));
    } else {
      setSelectedItems([...selectedItems, index]);
    }
  };
  
  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    setSelectedItems([]);
  };
  
  const addSelectedItemsToList = (targetListId) => {
    if (!targetListId || selectedItems.length === 0) return;
    
    const itemsToAdd = selectedItems.map(index => masterList.items[index]);
    
    // Add each selected item to the target list
    const addPromises = itemsToAdd.map(item => 
      api.addGroceryItem(targetListId, item.name)
    );
    
    Promise.all(addPromises)
      .then(() => {
        // Update the target list if it's the current list
        if (currentList && currentList.id === targetListId) {
          fetchListItems(targetListId);
        }
        
        // Reset selection
        setSelectedItems([]);
        setIsMultiSelectMode(false);
        setShowListSelection(false);
        setTargetListId(null);
      })
      .catch(error => {
        console.error("Error adding items to list:", error);
      });
  };
  
  // Enhanced function to add to master list with deduplication
  const addToMasterList = async (itemName) => {
    if (!user || !itemName.trim()) return;
    
    try {
      // Check if item already exists in master list (case insensitive)
      const normalizedName = itemName.toLowerCase().trim();
      const existingItem = masterList.items.find(item => 
        item.name.toLowerCase().trim() === normalizedName
      );
      
      if (!existingItem) {
        const newMasterItem = await api.addMasterListItem(user.uid, itemName);
        
        setMasterList(prev => ({
          ...prev,
          items: [...prev.items, newMasterItem]
        }));
      }
      
      return true;
    } catch (error) {
      console.error("Error adding to master list:", error);
      return false;
    }
  };

  if (loading) return <div className="flex items-center justify-center h-full"><div className="loading">Loading...</div></div>;
  if (!user) return <div className="p-6">Please sign in to access the grocery list</div>;

  // Render lists view for the "All Lists" option
  const renderListsView = () => {
    if (view !== VIEWS.LISTS) return null;
    
    return (
      <div className="py-4">
        <h2 className="text-xl font-semibold text-primary-dm mb-4">My Grocery Lists</h2>
        
        {groceryLists && groceryLists.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-secondary-dm mb-4">You don't have any grocery lists yet.</p>
            <form onSubmit={createNewList} className="max-w-md mx-auto">
              <div className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="New List Name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="p-3 border rounded text-lg w-full"
                />
                <button 
                  type="submit"
                  className="bg-primary text-white px-4 py-3 rounded text-lg font-medium"
                >
                  Create First List
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groceryLists && groceryLists.map(list => (
              <div 
                key={list.id}
                className="p-4 border rounded-lg hover:shadow-md cursor-pointer"
                onClick={() => selectList(list)}
              >
                <h3 className="text-lg font-medium text-primary-dm">{list.name}</h3>
                <p className="text-sm text-secondary-dm mt-1">
                  {list.items ? `${list.items.length} items • ${list.items.filter(i => i.completed).length} completed` : 'Loading items...'}
                </p>
              </div>
            ))}
            
            <div className="p-4 border rounded-lg border-dashed">
              <form onSubmit={createNewList} className="space-y-3">
                <input
                  type="text"
                  placeholder="New List Name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="p-2 border rounded w-full"
                />
                <button 
                  type="submit"
                  className="bg-primary text-white px-3 py-2 rounded text-sm font-medium"
                >
                  Create List
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render Grocery Lists view
  return (
    <div className="p-4 md:p-6 max-w-full w-full h-full relative">
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl md:text-3xl font-bold text-primary-dm">
          {view === VIEWS.LIST && currentList ? currentList.name : 
           view === VIEWS.MASTER ? 'Master List' : 'My Grocery Lists'}
        </h1>
        
        {/* Menu Button */}
        <div className="relative">
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          
          {/* Dropdown Menu - updated with new options */}
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-dark-background ring-1 ring-black ring-opacity-5 z-10">
              <div className="py-1">
                <button 
                  onClick={() => { setView(VIEWS.LIST); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Current List
                </button>
                <button 
                  onClick={() => { setView(VIEWS.MASTER); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Master List
                </button>
                <button 
                  onClick={() => { setView(VIEWS.LISTS); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  All Lists
                </button>
                
                {view === VIEWS.MASTER && (
                  <>
                    <button 
                      onClick={() => { 
                        toggleMultiSelectMode(); 
                        setMenuOpen(false); 
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {isMultiSelectMode ? "Cancel Selection" : "Select Items"}
                    </button>
                    
                    {isMultiSelectMode && selectedItems.length > 0 && (
                      <button 
                        onClick={() => { 
                          setShowListSelection(true);
                          setMenuOpen(false); 
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Add Selected to List
                      </button>
                    )}
                    
                    <button 
                      onClick={() => {
                        const confirmClear = window.confirm("Are you sure you want to clear all items from the master list?");
                        if (confirmClear) {
                          // Implement this API endpoint to clear master list
                          api.clearMasterList(user.uid)
                            .then(() => {
                              setMasterList(prev => ({ ...prev, items: [] }));
                            })
                            .catch(error => {
                              console.error("Error clearing master list:", error);
                            });
                        }
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Clear Master List
                    </button>
                  </>
                )}
                
                {view === VIEWS.LIST && (
                  <button 
                    onClick={deleteCurrentList}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Delete This List
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Lists View */}
      {view === VIEWS.LISTS ? (
        renderListsView()
      ) : (
        <>
          {/* Items List */}
          <div className="mb-20">
            <ul className="list-none p-0 divide-y divide-gray-200 dark:divide-gray-700">
              {(view === VIEWS.LIST ? (currentList?.items ?? []) : masterList.items).length === 0 ? (
                <li className="py-3 px-1 text-center text-secondary-dm">No items in this list yet</li>
              ) : (
                (view === VIEWS.LIST ? (currentList?.items ?? []) : masterList.items).map((item, index) => (
                  <li 
                    key={index}
                    className="py-3 px-1 relative transition-colors"
                    onTouchStart={(e) => handleTouchStart(e, index)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => handleItemClick(index)}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Checkbox for multi-select or completion */}
                      {!isMobile && (
                        view === VIEWS.MASTER && isMultiSelectMode ? (
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(index)}
                            onChange={() => toggleItemSelection(index)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-5 w-5"
                          />
                        ) : (
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => toggleItem(index)}
                            className="h-5 w-5"
                          />
                        )
                      )}
                      
                      {/* Item name */}
                      <span 
                        className={`flex-1 ${item.completed ? 'line-through text-gray-400' : 'text-secondary-dm'}`}
                      >
                        {item.name}
                      </span>
                      
                      {/* Action buttons */}
                      <div className="flex space-x-2">
                        {/* Add from master to current list button */}
                        {view === VIEWS.MASTER && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addFromMasterToCurrentList(item);
                            }}
                            className="text-primary p-1 rounded hover:bg-primary/10"
                            title="Add to current list"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        )}
                        
                        {/* Delete button - desktop */}
                        {!isMobile && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteItem(index);
                            }}
                            className="text-red-500 p-1 rounded hover:bg-red-50"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Mobile swipe instruction - shown only initially */}
                    {isMobile && index === 0 && groceryLists.length === 1 && (
                      <div className="text-xs text-secondary-dm mt-1">
                        Swipe right to mark complete, left to delete, long press to edit
                      </div>
                    )}
                  </li>
                ))
              )}
              
              {/* Inline Add Item Form */}
              {!editingItem && (view === VIEWS.LIST || view === VIEWS.MASTER) && (
                <li className="py-3 px-1 relative">
                  <form onSubmit={handleAddItem} className="flex items-center space-x-3">
                    {!isMobile && <div className="h-5 w-5"></div>} {/* Spacer to align with checkboxes */}
                    
                    <input
                      type="text"
                      placeholder="Add new item..."
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      className="flex-1 p-1 bg-transparent border-b border-gray-200 dark:border-gray-700 focus:outline-none focus:border-primary"
                    />
                    
                    <button 
                      type="submit"
                      className="text-green-500 p-1 rounded hover:bg-green-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </form>
                </li>
              )}
            </ul>
          </div>
          
          {/* Item editing form */}
          {editingItem && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-dark-background shadow-lg border-t">
              <form onSubmit={(e) => { e.preventDefault(); updateItem(); }} className="flex gap-2">
                <input
                  type="text"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  className="flex-1 p-2 border rounded"
                  autoFocus
                />
                <button 
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded"
                >
                  Update
                </button>
                <button 
                  type="button"
                  onClick={() => { setEditingItem(null); setNewItem(''); }}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
              </form>
            </div>
          )}
        </>
      )}
      
      {/* Add this List Selection Modal */}
      {showListSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-background rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <h2 className="text-lg font-medium text-secondary-dm mb-4">Select a list to add items to:</h2>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {groceryLists.length === 0 ? (
                <p className="text-center py-4">No lists available. Create a list first.</p>
              ) : (
                groceryLists.map(list => (
                  <button
                    key={list.id}
                    className="w-full text-left p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                    onClick={() => addSelectedItemsToList(list.id)}
                  >
                    <span className="text-primary-dm font-medium">{list.name}</span>
                    <span className="text-sm text-secondary-dm block mt-1">
                      {list.items.length} items
                    </span>
                  </button>
                ))
              )}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                className="px-4 py-2 border rounded text-secondary-dm hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => {
                  setShowListSelection(false);
                  setSelectedItems([]);
                  setIsMultiSelectMode(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 