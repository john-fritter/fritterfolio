import { useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth';
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
    try {
      await fetch(`${api.API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.uid, email: user.email })
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
      setMasterList(masterList);
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
      }
      
      // Add to master list if not already there
      const masterItemExists = masterList.items.some(
        item => item.name.toLowerCase() === newItem.toLowerCase()
      );
      
      if (!masterItemExists) {
        const newMasterItem = await api.addMasterListItem(user.uid, newItem);
        
        setMasterList(prev => ({
          ...prev,
          items: [...prev.items, newMasterItem]
        }));
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

  // Select a list and switch to list view
  const selectList = (list) => {
    setCurrentList(list);
    // Fetch items for this list
    fetchListItems(list.id);
    setView(VIEWS.LIST);
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

  if (loading) return <div className="flex items-center justify-center h-full"><div className="loading">Loading...</div></div>;
  if (!user) return <div className="p-6">Please sign in to access the grocery list</div>;

  // Render list creation if no lists
  if (groceryLists.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex flex-col h-full">
        <h1 className="text-3xl font-bold mb-6">Grocery Lists</h1>
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-center mb-6">You don&apos;t have any grocery lists yet</p>
          <form onSubmit={createNewList} className="w-full max-w-md">
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
      </div>
    );
  }

  // Render Grocery Lists view
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto h-full relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">
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
          
          {/* Dropdown Menu */}
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
                {view !== VIEWS.LISTS && (
                  <button 
                    onClick={clearBoughtItems}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Clear Bought Items
                  </button>
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
      {view === VIEWS.LISTS && (
        <div className="space-y-3">
          {groceryLists.map(list => (
            <div 
              key={list.id} 
              className="p-4 border rounded-lg shadow-sm hover:shadow cursor-pointer transition-shadow"
              onClick={() => selectList(list)}
            >
              <h2 className="text-xl font-medium">{list.name}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {list.items.length} items • {list.items.filter(i => i.completed).length} completed
              </p>
            </div>
          ))}
          
          {/* Create new list form */}
          <form onSubmit={createNewList} className="mt-6">
            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                placeholder="New List Name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="flex-1 p-2 border rounded"
              />
              <button 
                type="submit"
                className="bg-primary text-white px-4 py-2 rounded whitespace-nowrap"
              >
                Create List
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* List View or Master List View */}
      {(view === VIEWS.LIST || view === VIEWS.MASTER) && (
        <>
          {/* Items List */}
          <div className="mb-20">
            {(view === VIEWS.LIST ? (currentList?.items ?? []) : masterList.items).length === 0 ? (
              <p className="text-center py-8 text-gray-500">No items in this list yet</p>
            ) : (
              <ul>
                {(view === VIEWS.LIST ? (currentList?.items ?? []) : masterList.items).map((item, index) => (
                  <li 
                    key={index}
                    className="border-b py-3 px-1 relative transition-colors"
                    onTouchStart={(e) => handleTouchStart(e, index)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => handleItemClick(index)}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Checkbox - desktop */}
                      {!isMobile && (
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => toggleItem(index)}
                          className="h-5 w-5"
                        />
                      )}
                      
                      {/* Item name */}
                      <span 
                        className={`flex-1 ${item.completed ? 'line-through text-gray-400' : ''}`}
                      >
                        {item.name}
                      </span>
                      
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
                    
                    {/* Mobile swipe instruction - shown only initially */}
                    {isMobile && index === 0 && groceryLists.length === 1 && (
                      <div className="text-xs text-gray-400 mt-1">
                        Swipe right to mark complete, left to delete, long press to edit
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Add/Edit Item Form */}
          {editingItem ? (
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
          ) : (
            <>
              {/* Desktop Add Item Form */}
              {!isMobile && (
                <div className="fixed bottom-0 left-0 right-0 md:left-32 p-4 bg-white dark:bg-dark-background shadow-lg border-t">
                  <form onSubmit={addItem} className="flex gap-2 max-w-4xl mx-auto">
                    <input
                      type="text"
                      placeholder="Add new item"
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      className="flex-1 p-2 border rounded"
                    />
                    <button 
                      type="submit"
                      className="bg-primary text-white px-4 py-2 rounded"
                    >
                      Add
                    </button>
                  </form>
                </div>
              )}
              
              {/* Mobile floating add button */}
              {isMobile && (
                <button
                  onClick={() => setEditingItem({ index: -1, name: '' })}
                  className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center text-2xl"
                >
                  +
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
} 