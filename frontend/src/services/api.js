import { getAuthHeader } from './auth';

// Fix network addressing
export const API_URL = (() => {
  const hostname = window.location.hostname;
  const port = '5000'; // Your backend port
  
  if (hostname === 'localhost') {
    return `http://localhost:${port}/api`;
  }
  
  // For all other cases, use the current hostname
  return `http://${hostname}:${port}/api`;
})();

// Get all grocery lists for a user
export const getGroceryLists = async () => {
  const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' };
  
  const response = await fetch(`${API_URL}/grocery-lists`, {
    headers
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Error fetching lists: ${errorText}`);
    throw new Error('Failed to fetch grocery lists');
  }
  
  return response.json();
};

// Create a new grocery list
export const createGroceryList = async (name) => {
  const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' };
  const response = await fetch(`${API_URL}/grocery-lists`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name })
  });
  if (!response.ok) throw new Error('Failed to create grocery list');
  return response.json();
};

// Get all items for a grocery list
export const getGroceryItems = async (listId) => {
  const headers = { ...getAuthHeader() };
  const response = await fetch(`${API_URL}/grocery-lists/${listId}/items`, {
    headers
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Error fetching items: ${errorText}`);
    throw new Error(`Failed to fetch grocery items: ${errorText}`);
  }
  return response.json();
};

// Add item to a grocery list
export const addGroceryItem = async (listId, name) => {
  const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' };
  const response = await fetch(`${API_URL}/grocery-lists/${listId}/items`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name })
  });
  if (!response.ok) throw new Error('Failed to add grocery item');
  return response.json();
};

// Update a grocery item
export const updateGroceryItem = async (itemId, updates) => {
  const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' };
  const response = await fetch(`${API_URL}/grocery-lists/${updates.listId}/items/${itemId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Error updating item: ${errorText}`);
    throw new Error('Failed to update grocery item');
  }
  return response.json();
};

// Delete a grocery item
export const deleteGroceryItem = async (itemId) => {
  const headers = { ...getAuthHeader() };
  const response = await fetch(`${API_URL}/grocery-lists/items/${itemId}`, {
    method: 'DELETE',
    headers
  });
  if (!response.ok) throw new Error('Failed to delete grocery item');
  return response.json();
};

// Get master list for a user
export const getMasterList = async () => {
  const headers = { ...getAuthHeader() };
  const response = await fetch(`${API_URL}/master-list`, {
    headers
  });
  if (!response.ok) throw new Error('Failed to fetch master list');
  return response.json();
};

// Add item to master list - make sure we're sending the correct parameters
export const addMasterListItem = async (name, tags = []) => {
  const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' };
  
  const response = await fetch(`${API_URL}/master-list/items`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, tags })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Master list API error:", errorText);
    throw new Error('Failed to add master list item');
  }
  
  return response.json();
};

// Delete a grocery list
export const deleteGroceryList = async (listId) => {
  const response = await fetch(`${API_URL}/grocery-lists/${listId}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to delete grocery list');
  return response.json();
};

// Update a master list item
export const updateMasterListItem = async (itemId, updates) => {
  const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' };
  const response = await fetch(`${API_URL}/master-list/items/${itemId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates)
  });
  if (!response.ok) throw new Error('Failed to update master list item');
  return response.json();
};

// Delete a master list item
export const deleteMasterListItem = async (itemId) => {
  const headers = { ...getAuthHeader() };
  const response = await fetch(`${API_URL}/master-list/items/${itemId}`, {
    method: 'DELETE',
    headers
  });

  // Handle 409 Conflict status specially
  if (response.status === 409) {
    const data = await response.json();
    throw new Error(data.message || 'Item is in use in other lists');
  }

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Failed to delete master list item');
  }

  return response.json();
};

// Add this function to your api.js file
export const clearMasterList = async (userId) => {
  try {
    const response = await fetch(`${API_URL}/users/${userId}/master-list/clear`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to clear master list');
    }
    
    return true;
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
};

// Ensure we have a proper way to get the auth token
const getAuthToken = () => {
  return localStorage.getItem('token') || '';
};

// Update a grocery list
export const updateGroceryList = async (listId, updates) => {
  const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' };
  const response = await fetch(`${API_URL}/grocery-lists/${listId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Update list API error:", errorText);
    throw new Error('Failed to update grocery list');
  }
  
  return response.json();
};

// Update registration function for better mobile support
export const registerUser = async (userData) => {
  try { 
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
      // Important for mobile browsers
      mode: 'cors',
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Registration failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

// Share a list with another user
export const shareList = async (listId, email) => {
  const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' };
  
  const response = await fetch(`${API_URL}/grocery-lists/${listId}/share`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to share grocery list');
  }
  
  return response.json();
};

// Get pending shared lists
export const getPendingSharedLists = async () => {
  const headers = { ...getAuthHeader() };
  
  const response = await fetch(`${API_URL}/grocery-lists/shared/pending`, {
    headers
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch pending shared lists');
  }
  
  return response.json();
};

// Get accepted shared lists
export const getAcceptedSharedLists = async () => {
  const headers = { ...getAuthHeader() };
  
  const response = await fetch(`${API_URL}/grocery-lists/shared/accepted`, {
    headers
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch accepted shared lists');
  }
  
  return response.json();
};

// Accept or reject a shared list
export const respondToSharedList = async (shareId, status) => {
  const headers = { ...getAuthHeader(), 'Content-Type': 'application/json' };
  
  const response = await fetch(`${API_URL}/grocery-lists/shared/${shareId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ status })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to ${status} shared list`);
  }
  
  return response.json();
};

// Get all tags for the current user
export const getTags = async () => {
  const headers = { ...getAuthHeader() };
  const response = await fetch(`${API_URL}/tags`, {
    headers
  });
  if (!response.ok) throw new Error('Failed to fetch tags');
  return response.json();
};

// Delete a tag
export const deleteTag = async (tagText) => {
  const headers = { ...getAuthHeader() };
  const response = await fetch(`${API_URL}/tags/${encodeURIComponent(tagText)}`, {
    method: 'DELETE',
    headers
  });
  if (!response.ok) throw new Error('Failed to delete tag');
  return response.json();
};